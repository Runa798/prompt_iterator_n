# 开发规范和规则

- Next.js 16+ 在 Windows 环境下配合 Tailwind CSS v4 可能出现 Native Binding (lightningcss/oxide) 兼容性问题。
解决方法：彻底清理 node_modules 和 package-lock.json 后重装，或显式安装平台特定的 optionalDependencies。
启动脚本：不要使用 --turbo=false，直接使用 next dev (默认 Webpack) 或 next dev --turbo (启用 Turbopack)。
- 用户要求提示词迭代器输出必须是结构化的多维度建议表单（Generative UI），而非纯文本。支持用户选择、修改或新增。同时要求完善配置校验和模型自定义功能。
- 项目已实现 Generative UI 结构化输出（PromptProposalCard）和 Settings 连接测试功能。未来开发需维护此模式，禁止退化回纯文本输出。
