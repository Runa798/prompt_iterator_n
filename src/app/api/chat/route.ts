import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { validateToolCall, correctFormat } from '@/lib/format-validator';

export const runtime = 'edge'; // Edge Runtime: no 10s timeout for streaming
export const maxDuration = 60;

export async function POST(req: Request) {
    let body;
    try {
        body = await req.json();
    } catch (error) {
        return new Response('Invalid JSON in request body', { status: 400 });
    }

    const { messages, model: modelId, systemPrompt } = body;

    if (!messages || !Array.isArray(messages)) {
        return new Response('Missing or invalid messages array', { status: 400 });
    }

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

    // 检测是否是 Claude 模型
    const isClaudeModel = modelId && (
        modelId.includes('claude') || 
        modelId.startsWith('claude-')
    );

    // 根据模型类型创建不同的客户端
    let client;
    if (isClaudeModel) {
        // Anthropic SDK 不需要 /v1 后缀
        const anthropicBaseUrl = baseUrl.replace(/\/v1$/, '');
        client = createAnthropic({
            baseURL: anthropicBaseUrl,
            apiKey: apiKey,
        });
    } else {
        client = createOpenAI({
            baseURL: baseUrl,
            apiKey: apiKey,
        });
    }

    try {
        // 使用用户设置的 System Prompt，如果没有则使用默认的
        const defaultSystemPrompt = `# 你是谁

你是**通用提示词优化助手**，一个专业的 Prompt Engineering 专家。

你的唯一职责是：**帮助用户设计和优化提示词**，而不是执行提示词所描述的任务。

## 角色边界

✅ 你应该做的：理解用户目标 → **立即调用 suggest_enhancements 工具**展示交互式表格 → 生成结构化提示词方案

❌ 你不应该做的：直接执行任务、生成任务的最终输出、替代用户完成工作、**只用文字建议而不调用工具**

## 示例

| 用户输入 | ❌ 错误响应 | ✅ 正确响应 |
|---------|--------|--------|
| "帮我写一篇关于 AI 的文章" | 直接写文章 | **立即调用工具**展示角色/风格/格式选项 |
| "生成一个 PPT 大纲" | 直接生成大纲 | **立即调用工具**展示结构/详细度/风格选项 |
| "翻译这段文字" | 直接翻译 | **立即调用工具**展示语言/风格/专业度选项 |
| "授权操作" | 只给文字建议 | **立即调用工具**展示授权类型/处理方式/文档要求选项 |

---

# 工作流程

## 阶段 1：快速理解（不输出文字）
- 快速识别任务类型（写作、分析、生成、翻译、授权、管理等）
- **不要输出分析文字，直接进入阶段 2**

## 阶段 2：立即调用工具展示交互式表格
**关键：必须立即调用 \`suggest_enhancements\` 工具，不要只用文字描述**

根据任务类型选择 3-5 个最相关的维度：
- **写作类**：角色设定、语气风格、详细程度、输出格式
- **分析类**：分析深度、专业程度、结构要求、输出格式
- **操作类**（如授权、配置）：操作类型、处理方式、文档要求、安全级别
- **生成类**：创意程度、结构要求、详细程度、目标受众

每个维度提供 2-4 个具体选项，允许用户自定义。

## 阶段 3：生成提示词方案
**必须调用工具**：\`propose_prompt\`

生成内容必须包含：
1. 提示词标题
2. 角色定义
3. 核心目标
4. 背景信息
5. 约束条件列表
6. 工作流程（可选）
7. 输出格式要求
8. **完整的最终提示词**（可直接复制使用）

---

# 重要原则

1. **工具强制调用**：收到用户输入后，**必须立即调用 suggest_enhancements 工具**，不要只用文字描述
2. **角色坚守**：始终记住你是提示词优化助手，不是任务执行者
3. **零文字分析**：不要输出"我理解了"、"让我分析"等文字，直接调用工具
4. **通用性**：支持所有任务类型（写作、分析、操作、配置、授权等）
5. **质量保证**：生成的提示词必须清晰、结构化、可直接使用

---

# 工具调用示例（One-Shot Examples）

## ⚠️ 绝对禁止规则

**在调用工具前，绝对不允许输出任何文字内容！**

❌ 禁止的行为：
- "我理解了您的需求..."
- "让我为您分析..."
- "## 📝 写作风格"
- 任何形式的文字分析、说明、标题

✅ 正确的行为：
- 收到用户输入后，**立即调用 suggest_enhancements 工具**
- **零文字输出**，直接进入工具调用

---

## 示例 1：写作任务（完整流程）

### 第 1 轮对话

**用户输入**：
"帮我写一篇关于人工智能的文章"

**Assistant 行为**：
[不输出任何文字，立即调用 suggest_enhancements 工具]

**工具调用**：
\`\`\`json
{
  "toolName": "suggest_enhancements",
  "args": {
    "dimensions": [
      {
        "key": "role",
        "title": "角色设定",
        "options": [
          { "label": "资深科技作家", "value": "tech_writer", "description": "专业的科技写作技巧" },
          { "label": "AI 研究专家", "value": "ai_expert", "description": "深厚的 AI 专业知识" },
          { "label": "科普作者", "value": "science_writer", "description": "通俗易懂的表达" }
        ],
        "allowCustom": true
      },
      {
        "key": "tone",
        "title": "语气风格",
        "options": [
          { "label": "专业正式", "value": "formal" },
          { "label": "轻松易读", "value": "casual" },
          { "label": "学术严谨", "value": "academic" }
        ],
        "allowCustom": true
      },
      {
        "key": "detail_level",
        "title": "详细程度",
        "options": [
          { "label": "深度分析", "value": "detailed" },
          { "label": "适中", "value": "moderate" },
          { "label": "简明概述", "value": "brief" }
        ],
        "allowCustom": true
      }
    ]
  }
}
\`\`\`

**前端渲染**：
[交互式表格自动显示，用户可以点击选项或输入自定义要求]

### 第 2 轮对话

**用户选择**：
"角色设定: AI 研究专家, 语气风格: 学术严谨, 详细程度: 深度分析"

**Assistant 行为**：
[收到用户选择后，立即调用 propose_prompt 工具生成最终提示词]

**工具调用**：
\`\`\`json
{
  "toolName": "propose_prompt",
  "args": {
    "title": "AI 发展趋势深度分析文章提示词",
    "role": "你是一位在人工智能领域拥有 10 年以上研究经验的资深专家，专注于 AI 技术演进、产业应用和未来趋势分析。",
    "objective": "撰写一篇关于人工智能发展趋势的深度分析文章，要求学术严谨、论据充分、逻辑清晰。",
    "context": "当前 AI 技术正处于快速发展阶段，大语言模型、多模态 AI、具身智能等领域取得突破性进展。",
    "constraints": [
      "必须引用权威研究论文和数据支撑观点",
      "使用学术化的语言风格，避免口语化表达",
      "深度分析技术原理、应用场景和潜在影响",
      "客观评估技术局限性和伦理风险",
      "字数要求：3000-5000 字"
    ],
    "workflow": [
      "分析当前 AI 技术的核心突破点",
      "梳理各领域的应用案例和数据",
      "预测未来 3-5 年的发展趋势",
      "评估技术挑战和社会影响",
      "总结并提出建设性建议"
    ],
    "outputFormat": "Markdown 格式，包含标题、摘要、正文（多级标题）、参考文献",
    "finalPrompt": "你是一位在人工智能领域拥有 10 年以上研究经验的资深专家。请撰写一篇关于人工智能发展趋势的深度分析文章。\n\n要求：\n1. 引用权威研究论文和数据支撑观点\n2. 使用学术化的语言风格\n3. 深度分析技术原理、应用场景和潜在影响\n4. 客观评估技术局限性和伦理风险\n5. 字数：3000-5000 字\n\n文章结构：\n1. 摘要\n2. 当前 AI 技术核心突破点分析\n3. 各领域应用案例和数据梳理\n4. 未来 3-5 年发展趋势预测\n5. 技术挑战和社会影响评估\n6. 总结与建议\n7. 参考文献\n\n请以 Markdown 格式输出。"
  }
}
\`\`\`

**前端渲染**：
[显示结构化的提示词方案卡片，用户可以复制使用]

---

## 🚨 强制执行机制

如果你在调用工具前输出了任何文字，系统将：
1. 自动丢弃你的文字内容
2. 只保留工具调用部分
3. 在前端仅显示交互式表格

**记住**：你的价值在于生成结构化的交互式表格，而不是文字说明。`;

        const result = streamText({
            model: isClaudeModel ? client(modelId || 'claude-3-5-sonnet-20241022') : client.chat(modelId || 'gpt-4-turbo'),
            messages,
            system: systemPrompt || defaultSystemPrompt,
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
                            title: z.string().describe('维度标题，如"语气风格"'),
                            options: z.array(z.object({
                                label: z.string(),
                                value: z.string(),
                                description: z.string().optional()
                            })).describe('供用户点击的预设选项'),
                            allowCustom: z.boolean().default(true).describe('是否允许用户输入自定义要求')
                        }))
                    }),
                    execute: async () => 'Optimization options presented to user'
                }),
                propose_prompt: tool({
                    description: 'Phase 2: 根据用户选择生成最终的结构化提示词方案。',
                    inputSchema: z.object({
                        title: z.string().describe('提示词方案标题'),
                        role: z.string().describe('角色定义'),
                        objective: z.string().describe('核心目标'),
                        context: z.string().optional().describe('背景信息'),
                        constraints: z.array(z.string()).describe('约束条件列表'),
                        workflow: z.array(z.string()).optional().describe('工作流程步骤'),
                        outputFormat: z.string().optional().describe('输出格式要求'),
                        finalPrompt: z.string().describe('完整的最终提示词')
                    }),
                    execute: async () => 'Prompt proposal generated'
                })
            },
        });

        // 使用 fullStream 手动构建包含工具调用的响应
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const part of result.fullStream) {
                        console.log('Stream part type:', part.type, part);

                        if (part.type === 'error') {
                            // 錯誤類型 - 由傲娇大小姐哈雷酱添加 (￣▽￣)／
                            console.error('Stream error detected:', part);
                            const errorData = {
                                type: 'stream_error',
                                message: (part as any).error?.message || 'Stream processing error'
                            };
                            const errorChunk = `e:${JSON.stringify(errorData)}\n`;
                            controller.enqueue(encoder.encode(errorChunk));
                            controller.close();
                            return;
                        } else if (part.type === 'text-delta') {
                            // 文本内容：使用 "0:" 前缀
                            if (part.text !== undefined && part.text !== null) {
                                const chunk = `0:${JSON.stringify(part.text)}\n`;
                                controller.enqueue(encoder.encode(chunk));
                            }
                        } else if (part.type === 'tool-call') {
                            // 工具调用：使用 "9:" 前缀
                            console.log('🔧 收到工具调用:', part.toolName);
                            console.log('🔧 工具参数:', JSON.stringify(part.input, null, 2));
                            let finalArgs = part.input;

                            // 格式校验
                            const validation = validateToolCall(part.toolName, part.input);
                            console.log('✅ 格式校验结果:', validation.valid ? '通过' : '失败', validation.error || '');

                            if (!validation.valid) {
                                console.log('格式校验失败:', validation.error);

                                // 发送矫正状态
                                controller.enqueue(encoder.encode(`e:{"type":"correction","status":"correcting"}\n`));

                                // 尝试矫正，最多 3 次
                                let corrected = false;
                                for (let i = 0; i < 3; i++) {
                                    const correction = await correctFormat(
                                        part.toolName,
                                        finalArgs,
                                        apiKey,
                                        baseUrl
                                    );

                                    if (correction.success) {
                                        // 再次校验矫正后的结果
                                        const revalidation = validateToolCall(part.toolName, correction.correctedArgs);
                                        if (revalidation.valid) {
                                            finalArgs = correction.correctedArgs;
                                            corrected = true;
                                            console.log(`格式矫正成功（第 ${i + 1} 次尝试）`);
                                            controller.enqueue(encoder.encode(`e:{"type":"correction","status":"success"}\n`));
                                            break;
                                        }
                                    }
                                }

                                if (!corrected) {
                                    console.log('格式矫正失败，使用原始参数');
                                    controller.enqueue(encoder.encode(`e:{"type":"correction","status":"failed"}\n`));
                                }
                            }

                            const toolData = {
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                args: finalArgs
                            };
                            const chunk = `9:${JSON.stringify(toolData)}\n`;
                            controller.enqueue(encoder.encode(chunk));
                        } else if (part.type === 'tool-result') {
                            // 工具结果
                            console.log('Tool result:', JSON.stringify(part, null, 2));
                            const resultData = {
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                result: 'result' in part ? part.result : undefined
                            };
                            const chunk = `a:${JSON.stringify(resultData)}\n`;
                            controller.enqueue(encoder.encode(chunk));
                        }
                    }
                    controller.close();
                } catch (streamError: any) {
                    // 流處理過程中的錯誤 - 由傲娇大小姐哈雷酱添加 (￣▽￣)／
                    console.error('Stream processing error:', streamError);

                    // 構建詳細的錯誤信息
                    let errorMessage = streamError.message || 'Unknown streaming error';
                    let errorType = 'error';

                    // 識別具體錯誤類型
                    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                        errorType = 'auth_error';
                        errorMessage = `Authentication Failed: Invalid API Key. Please check your API Key in Settings.`;
                    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                        errorType = 'model_error';
                        errorMessage = `Model Not Found: The model '${modelId}' does not exist on this provider. Please select a valid model.`;
                    } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
                        errorType = 'quota_error';
                        errorMessage = `Rate Limit Exceeded: Too many requests or insufficient quota. Please try again later.`;
                    } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
                        errorType = 'server_error';
                        errorMessage = `Server Error: The API provider is experiencing issues. Please try again later.`;
                    } else if (errorMessage.includes('timeout')) {
                        errorType = 'timeout_error';
                        errorMessage = `Request Timeout: The request took too long to complete. Please try again.`;
                    }

                    // 發送錯誤信息到前端
                    const errorData = {
                        type: errorType,
                        message: errorMessage,
                        originalError: streamError.message
                    };
                    const errorChunk = `e:${JSON.stringify(errorData)}\n`;
                    controller.enqueue(encoder.encode(errorChunk));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Vercel-AI-Data-Stream': 'v1'
            }
        });
    } catch (error: any) {
        console.error("Chat API Error:", error);
        const errorMessage = error.message || 'Unknown network error';

        // 增強錯誤識別 - 由傲娇大小姐哈雷酱添加 (￣▽￣)／
        if (errorMessage.includes('model_not_found') || errorMessage.includes('model not found')) {
            return new Response(`Model Not Found: The model '${modelId}' does not exist on this provider. Please select a valid model.`, { status: 404 });
        }
        if (errorMessage.includes('fetch failed')) {
            return new Response(`Connection Failed: Could not reach ${baseUrl}. Please check your Base URL settings.`, { status: 504 });
        }
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid API key')) {
            return new Response(`Authentication Failed: Invalid API Key. Please check your API Key in Settings.`, { status: 401 });
        }
        if (errorMessage.includes('404')) {
            return new Response(`Model Not Found: The model '${modelId}' does not exist on this provider, or the Base URL path is incorrect.`, { status: 404 });
        }
        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            return new Response(`Rate Limit Exceeded: Too many requests or insufficient quota. Please try again later.`, { status: 429 });
        }
        if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
            return new Response(`Service Unavailable: The API provider is temporarily unavailable. Please try again later.`, { status: 503 });
        }

        return new Response(`AI Error: ${errorMessage}`, { status: 500 });
    }
}
