# 交互式提示词迭代器 (Interactive Prompt Iterator)

这是一个基于 **Next.js 14+**、**Shadcn UI** 和 **Vercel AI SDK** 构建的现代化提示词优化 Web 应用。旨在通过交互式对话，帮助用户将模糊的想法转化为结构化、高质量的 AI 提示词。

## 核心特性
- **纯前端架构**：无需独立后端数据库，所有数据（LLM API Key、对话历史）均存储在用户浏览器本地。
- **本地优先 (Local-First)**：
    - **配置存储**：使用 `Zustand` + `LocalStorage` 存储 API Key 和模型偏好。
    - **历史记录**：使用 `Dexie.js` (IndexedDB) 存储海量对话记录（包含结构化数据）。
- **交互式引导**：
    - 首页提供 "灵感卡片" (Inspiration Cards) 快速启动任务。
    - 支持 "Demo 模式"（输入 API Key 为 `demo` 即可体验模拟对话）。
- **极简 UI**：采用 TailwindCSS + Shadcn/UI 设计系统，支持深色模式。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **UI**: Tailwind CSS v4, Shadcn/UI, Lucide React
- **State Management**: Zustand
- **Database**: Dexie.js (IndexedDB wrapper)
- **AI Integration**: Vercel AI SDK (@ai-sdk/react, @ai-sdk/openai)

## 快速开始

### 1. 安装依赖
```bash
npm install
```
*注意：在 Windows 环境下，如遇到 `@tailwindcss/oxide` 或 `lightningcss` 相关的 native binding 错误，请尝试安装相关平台包：*
```bash
npm install --save-optional @tailwindcss/oxide-win32-x64-msvc
```

### 2. 启动开发服务器
```bash
npm run dev
```
访问 http://localhost:3000

### 3. 使用说明
1. 点击右上角 **设置 (Gear Icon)**。
2. 输入您的 OpenAI API Key（或兼容的 Base URL）。
    - **演示模式**：在 API Key 中输入 `demo`，点击保存，即可体验模拟回复。
3. 点击首页的 "灵感卡片" 或直接在下方输入框描述您的需求。

## 目录结构
- `src/app`: Next.js App Router 页面与 API 路由。
- `src/components`: UI 组件 (Shadcn) 与业务组件。
- `src/lib`: 工具库 (Store, DB, Utils)。
- `.ai_memory`: 项目上下文记忆（用于 AI 辅助开发）。
