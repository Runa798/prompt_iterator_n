# 常用模式和最佳实践

- Vercel AI SDK 3.x (Legacy) 中实现 Generative UI 的最佳实践是利用 tool-calling。
后端在 streamText 中定义 tools (如 suggest_options, ask_questions)。
前端在 useChat 的 messages 循环中检查 toolInvocations，并渲染对应的 React 组件（Checkbox, Radio 等），而非仅显示文本。
最后将用户的选择作为 toolResult 发回给 AI。
- Vercel AI SDK 3.x 更新提示: createOpenAI 返回的 provider 实例可以直接调用(modelId)返回模型，但遇到类型推断问题时可能需要检查具体是 Chat 还是 Completion 模型。
