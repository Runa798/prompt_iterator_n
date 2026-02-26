import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AppSettings {
  apiKey: string
  baseUrl: string
  model: string
  systemPrompt: string
  availableModels: string[]
  correctionModel: string
  autoRetry: boolean // 自动重试配置 - 由傲娇大小姐哈雷酱添加 (￣▽￣)／
  maxRetries: number // 最大重试次数
}

interface AppState extends AppSettings {
  setApiKey: (key: string) => void
  setBaseUrl: (url: string) => void
  setModel: (model: string) => void
  setSystemPrompt: (prompt: string) => void
  setAvailableModels: (models: string[]) => void
  setCorrectionModel: (model: string) => void
  setAutoRetry: (enabled: boolean) => void // 设置自动重试
  setMaxRetries: (count: number) => void // 设置最大重试次数
  resetSettings: () => void
}

interface EndpointConfig {
  baseUrl: string
  apiKey: string
}

interface ResolvedEndpointConfig extends EndpointConfig {
  isModelPreset: boolean
}

// 为特定模型指定固定 endpoint，未命中的模型继续使用用户在设置中的 baseUrl/apiKey。
export const MODEL_ENDPOINTS: Record<string, EndpointConfig> = {
  'gemini-3.1-pro-preview': {
    baseUrl: 'https://undyapi.com/v1',
    apiKey: 'sk-FO6MIy3cqNwzYj5hUh5STYtTMrfHlZGywn4kV4Auxe0bGoyE',
  },
  'gemini-3-pro-preview': {
    baseUrl: 'https://undyapi.com/v1',
    apiKey: 'sk-FO6MIy3cqNwzYj5hUh5STYtTMrfHlZGywn4kV4Auxe0bGoyE',
  },
  'claude-sonnet-4-6': {
    baseUrl: 'https://right.codes/claude-aws/v1',
    apiKey: 'sk-343543dff035434eb13b45c775ecb9c5',
  },
  'claude-opus-4-6': {
    baseUrl: 'https://right.codes/claude-aws/v1',
    apiKey: 'sk-343543dff035434eb13b45c775ecb9c5',
  },
  'gpt-5.3-codex': {
    baseUrl: 'https://right.codes/codex/v1',
    apiKey: 'sk-343543dff035434eb13b45c775ecb9c5',
  },
}

export function getModelEndpointConfig(
  model: string,
  fallback: EndpointConfig
): ResolvedEndpointConfig {
  const endpoint = MODEL_ENDPOINTS[model]
  if (endpoint) {
    return {
      ...endpoint,
      isModelPreset: true,
    }
  }

  return {
    baseUrl: fallback.baseUrl,
    apiKey: fallback.apiKey,
    isModelPreset: false,
  }
}

const defaultSettings: AppSettings = {
  apiKey: 'sk-FO6MIy3cqNwzYj5hUh5STYtTMrfHlZGywn4kV4Auxe0bGoyE',
  baseUrl: 'https://undyapi.com/v1',
  model: 'gemini-3.1-pro-preview',
  correctionModel: 'gemini-3-flash-preview',
  autoRetry: true, // 默认启用自动重试 - 由傲娇大小姐哈雷酱添加 (￣▽￣)／
  maxRetries: 3, // 默认最多重试3次
  systemPrompt: '你是交互式提示词优化助手。你的目标是通过多轮对话，引导用户明确需求，并最终生成高质量的结构化提示词。\n\n重要提示：\n1. 当用户上传图片时，请仔细分析图片内容，并结合用户的文字描述来理解他们的真实需求\n2. 当用户上传文档（PDF/DOCX）时，文档内容会以文本形式提供，请根据文档内容和用户的指令来优化提示词\n3. 你应该主动提出建议，使用交互式表单让用户选择优化方向',
  availableModels: [
    // Gemini 系列 (UndyAPI - 支持 NSFW)
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    // GPT-5 系列
    'gpt-5.2',
    'gpt-5.2-codex',
    'gpt-5.3-codex',
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
    'claude-sonnet-4-6',
    'claude-opus-4-6',
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
      setCorrectionModel: (correctionModel) => set({ correctionModel }),
      setAutoRetry: (autoRetry) => set({ autoRetry }), // 由傲娇大小姐哈雷酱添加 (￣▽￣)／
      setMaxRetries: (maxRetries) => set({ maxRetries }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'prompt-iterator-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
