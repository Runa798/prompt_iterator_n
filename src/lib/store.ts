import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppSettings {
  apiKey: string
  baseUrl: string
  model: string
  systemPrompt: string
  availableModels: string[]
}

interface AppState extends AppSettings {
  setApiKey: (key: string) => void
  setBaseUrl: (url: string) => void
  setModel: (model: string) => void
  setSystemPrompt: (prompt: string) => void
  setAvailableModels: (models: string[]) => void
  resetSettings: () => void
}

const defaultSettings: AppSettings = {
  apiKey: 'sk-Mdj54E4QkE5dQi6jV4TUli6kEN4fsPQKuIjchrBl6hIjvws1',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v3.2-exp',
  systemPrompt: '你是交互式提示词优化助手。你的目标是通过多轮对话，引导用户明确需求，并最终生成高质量的结构化提示词。\n\n重要提示：\n1. 当用户上传图片时，请仔细分析图片内容，并结合用户的文字描述来理解他们的真实需求\n2. 当用户上传文档（PDF/DOCX）时，文档内容会以文本形式提供，请根据文档内容和用户的指令来优化提示词\n3. 你应该主动提出建议，使用交互式表单让用户选择优化方向',
  availableModels: [
    // OpenAI 系列
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'o1',
    'o1-mini',
    // Anthropic Claude 系列
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    // 国产大模型
    'deepseek-v3.2-exp',
    'deepseek-chat',
    'deepseek-reasoner',
    'GLM-4-Plus',
    'GLM-4-Air',
    'Qwen-Max',
    'Qwen-Plus',
    'moonshot-v1-128k',
    'yi-lightning',
    'yi-large'
  ]
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setApiKey: (apiKey) => set({ apiKey }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setModel: (model) => set({ model }),
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setAvailableModels: (availableModels) => set({ availableModels }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'prompt-iterator-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
