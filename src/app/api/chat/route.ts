import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
    let { messages, model: modelId } = await req.json();

    const apiKey = req.headers.get('x-api-key');
    let baseUrl = req.headers.get('x-base-url') || 'https://api.openai.com/v1';

    // Normalize Base URL: Ensure it doesn't end with a slash for consistency
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    // Note: User might input 'https://api.deepseek.com' which needs '/v1' appended, 
    // or they might input 'https://api.deepseek.com/v1' directly. 
    // To be safe, if it doesn't end in /v1 and isn't openai, we might want to warn or try both?
    // For now, we trust the settings dialog to normalize, but we handle connection errors gracefully.

    // Demo Mode
    if (apiKey === 'demo') {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const text = "【演示模式】\n\n这是一个模拟回复。在真实模式下，我会调用工具生成结构化提示词。由于当前未配置真实 API Key，仅展示文本流式效果。\n\n您可以在设置中输入 OpenAI 或 DeepSeek 的 Key 来体验完整功能。";

                for (let i = 0; i < text.length; i++) {
                    const chunk = '0:' + JSON.stringify(text[i]) + '\n';
                    controller.enqueue(encoder.encode(chunk));
                    await new Promise(r => setTimeout(r, 20)); // Simulate typing delay
                }
                controller.close();
            }
        });
        return new Response(stream, {
            headers: { 'Content-Type': 'text/x-unknown; charset=utf-8' }
        });
    }

    if (!apiKey) {
        return new Response('Configuration Error: Missing API Key. Please configure it in Settings.', { status: 401 });
    }

    const openai = createOpenAI({
        baseURL: baseUrl,
        apiKey: apiKey,
    });

    try {
        const result = await streamText({
            model: openai.chat(modelId || 'gpt-4-turbo'),
            messages,
            system: `你是交互式提示词优化助手。你的目标是帮助用户把一个模糊的想法变成一个结构化、高质量的 Prompt。

**核心工作流**：
1. **Phase 1: 建议与澄清**
   - 当用户提出初步需求时，**不要直接生成 Prompt**。
   - 必须调用 \`suggest_enhancements\` 工具，提供 3-5 个关键维度的优化建议。
   - 维度示例：
     - **角色设定**: (e.g., 资深专家, 创意总监, 严谨学者)
     - **语气风格**: (e.g., 专业正式, 幽默风趣, 简洁明了)
     - **思考深度**: (e.g., 一步到位, 思维链CoT, 多角度辩证)
     - **输出格式**: (e.g., Markdown文档, JSON, 表格)
   - 每个维度提供 2-3 个具体的选项供用户点击选择，并允许自定义。

2. **Phase 2: 文档生成**
   - 当收到 \`suggest_enhancements\` 的工具反馈（用户的选择）后，生成最终的 Markdown 文档。
   - **文档格式要求**：
     - 必须包含 **# 最终提示词方案** (H1)
     - 必须包含 **目录 (TOC)**
     - **## 基础增强**: 分析你做了哪些基础优化。
     - **## 深度优化**: 根据用户选择的维度进行的特定优化。
     - **## 完整 Prompt 代码块**: 使用代码块包裹最终的 Prompt。

**原则**：
- 始终保持引导性。
- 最终输出必须是精美的 Markdown 格式。`,
            tools: {
                ask_questions: tool({
                    description: '当用户需求不明确时，调用此工具向用户提问。',
                    inputSchema: z.object({
                        questions: z.array(z.object({
                            id: z.string(),
                            text: z.string().describe('The question to ask the user'),
                            type: z.enum(['text', 'select', 'checkbox']).describe('Type of input required'),
                            options: z.array(z.string()).optional().describe('Options for select/checkbox')
                        }))
                    }),
                    execute: async () => 'User interaction required'
                }),
                suggest_enhancements: tool({
                    description: 'Phase 1: 提供多维度的优化建议供用户选择。',
                    inputSchema: z.object({
                        dimensions: z.array(z.object({
                            key: z.string(),
                            title: z.string().describe('维度标题，如“语气风格”'),
                            options: z.array(z.object({
                                label: z.string(),
                                value: z.string(),
                                description: z.string().optional()
                            })).describe('供用户点击的预设选项'),
                            allowCustom: z.boolean().default(true).describe('是否允许用户输入自定义要求')
                        }))
                    }),
                    execute: async () => 'Optimization options presented to user'
                })
            },
        });
        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error("Chat API Error:", error);
        // Return a JSON error that the frontend can parse nicely, 
        // or just a text response with a clear error prefix that the UI can handle.
        // Standard Response with 500 status is best, UI useChat onError handles it.
        const errorMessage = error.message || 'Unknown network error';

        if (errorMessage.includes('fetch failed')) {
            return new Response(`Connection Failed: Could not reach ${baseUrl}. Please check your Base URL settings.`, { status: 504 });
        }
        if (errorMessage.includes('401')) {
            return new Response(`Authentication Failed: Invalid API Key for ${baseUrl}.`, { status: 401 });
        }
        if (errorMessage.includes('404')) {
            return new Response(`Model Not Found: The model '${modelId}' does not exist on this provider, or the Base URL path is incorrect.`, { status: 404 });
        }

        return new Response(`AI Error: ${errorMessage}`, { status: 500 });
    }
}
