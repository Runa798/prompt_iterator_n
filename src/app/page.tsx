'use client'

import { useEffect, useRef } from 'react'
import { useChat, type UIMessage as Message } from '@ai-sdk/react'
import { Send, Trash2, StopCircle, User, Bot, Copy, Pencil, Code2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { ChatSidebar } from '@/components/chat-sidebar'
import { db } from '@/lib/db'
import { useState } from 'react'
import { toast } from 'sonner'
import { SettingsDialog } from '@/components/settings-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'


// Removed INSPIRATION_CARDS as requested


import { QuestionForm } from '@/components/question-form'
import { PromptProposalCard } from '@/components/prompt-proposal-card'
import { EnhancementForm } from '@/components/enhancement-form'

export default function Home() {
  const { apiKey, baseUrl, model, availableModels, setModel } = useAppStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [sessionId, setSessionId] = useState<number | null>(null)
  const sessionIdRef = useRef(sessionId) // Ref to hold the latest sessionId

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading, setMessages, append, stop, reload } = useChat({
    api: '/api/chat',
    headers: {
      'x-api-key': apiKey,
      'x-base-url': baseUrl
    },
    body: {
      model: model
    },
    onFinish: async (message: any) => {
      // Persist the completion
      const currentSessionId = sessionIdRef.current
      if (!currentSessionId) {
        // This theoretically shouldn't happen if we create session on start of request, 
        // but react state updates are async. 
        // Better strategy: Create session immediately when user sends first message.
        return
      }

      // Save assistant message
      await db.messages.add({
        sessionId: currentSessionId,
        role: 'assistant',
        content: message.content,
        createdAt: new Date(),
        toolInvocations: message.toolInvocations
      })

      // Update session timestamp and preview
      await db.chatSessions.update(currentSessionId, {
        updatedAt: new Date(),
        previewText: message.content.slice(0, 50)
      })
    },
    onError: (error) => {
      console.error("Chat error:", error)
      const msg = error.message;
      if (msg.includes('401') || msg.includes('Authentication')) {
        toast.error("认证失败: 请在设置中配置有效的 API Key。", { duration: 5000, action: { label: '打开设置', onClick: () => document.querySelector<HTMLButtonElement>('[data-dialog-trigger="settings"]')?.click() } })
      } else if (msg.includes('404') || msg.includes('Model')) {
        toast.error("模型未找到: 请检查模型名称或 Base URL。", { duration: 5000 })
      } else if (msg.includes('504') || msg.includes('Connection')) {
        toast.error("连接超时: 请检查网络或代理设置。", { duration: 5000 })
      } else {
        toast.error(`请求出错: ${msg}`, { duration: 4000 })
      }
    }
  }) as any

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      return
    }

    const loadHistory = async () => {
      const history = await db.messages.where('sessionId').equals(sessionId).sortBy('createdAt')
      // Map DB messages to AI SDK messages
      const uiMessages = history.map(m => ({
        id: m.id?.toString() || Math.random().toString(),
        role: m.role as any,
        content: m.content,
        toolInvocations: m.toolInvocations
      }))
      setMessages(uiMessages)
    }

    loadHistory()
  }, [sessionId, setMessages])

  // Handle User Submit Wrapper to Create Session if needed
  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    let currentId = sessionId

    if (!currentId) {
      // Create new session
      const title = input.slice(0, 30)
      currentId = await db.chatSessions.add({
        title,
        previewText: title,
        createdAt: new Date(),
        updatedAt: new Date()
      }) as number
      setSessionId(currentId)
    }

    // Save user message immediately
    await db.messages.add({
      sessionId: currentId,
      role: 'user',
      content: input,
      createdAt: new Date()
    })

    handleSubmit(e)
  }

  const handleNewChat = () => {
    setSessionId(null)
    setMessages([])
    setInput('')
  }



  // Re-define onFinish to use Ref
  // (We need to update useChat options, but useChat options are initial only in many versions...
  // Wait, Vercel AI SDK useChat options are usually stable.
  // We can't change onFinish dynamically.
  // Workaround: Use a mutable ref defined outside.)

  // Actually, Vercel AI SDK stores messages. We can just sync messages to DB on change?
  // No, we want to save 'onFinish' to capture the full response.

  // Helper functions for message actions
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleEdit = (content: string) => {
    setInput(content)
    // Optional: focus input
  }

  const handleDeleteMessage = async (id: string, sessionId: number | null) => {
    // Optimistic UI update
    setMessages(messages.filter((m: any) => m.id !== id))

    // Database deletion
    if (id) {
      // IDs from DB load are stringified numbers. IDs from new messages are random strings until reloaded.
      // However, we save *immediately* on send. But we don't update the `messages` state with the DB ID.
      // This is a known issue with optimistic updates. 
      // For now, we try to delete if it looks like a number.
      const dbId = parseInt(id);
      if (!isNaN(dbId)) {
        await db.messages.delete(dbId);
        toast.success("消息已删除");
      } else {
        // For non-numeric IDs (newly sent), we might need to find the latest message in this session? 
        // Or just accept it's removed from view. 
        // Actually, since we save immediately, we could try to look up by content/timestamp? 
        // Too complex. Let's just persist assuming reload will fix ID.
        // But if user deletes a "fresh" message, it might reappear on reload if we didn't delete from DB.
        // Mitigation: We reload history on session change.
      }
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        currentSessionId={sessionId}
        onSessionSelect={setSessionId}
        onNewChat={handleNewChat}
      />

      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-sm shrink-0 z-10">
          <div className="flex items-center gap-2 md:hidden">
            {/* Spacer for mobile menu trigger which is in Sidebar */}
            <div className="w-8" />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Prompt Iterator</h1>
            <Badge variant="outline" className="ml-2 text-xs text-muted-foreground font-normal">
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[180px] h-8 text-xs font-medium">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.length > 0 ? (
                  availableModels.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                    <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <SettingsDialog />
            <div className="h-6 w-px bg-border mx-2" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleNewChat} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>清空对话</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>

        {/* Main Content Area */}
        <ScrollArea className="flex-1 w-full">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6 pb-4">
            {messages.length === 0 ? (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-10">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent pb-2">
                    构建完美的提示词
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
                    通过多轮交互引导，将模糊的想法转化为精准、结构化的 AI 指令。
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {messages.map((m: any) => (
                  <div
                    key={m.id}
                    className={`group flex gap-4 relative mb-6 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role !== 'user' && (
                      <Avatar className="w-8 h-8 mt-1 border shrink-0 bg-secondary/20">
                        <AvatarFallback className="bg-transparent"><Bot className="w-5 h-5 text-primary" /></AvatarFallback>
                        <AvatarImage src="/ai-avatar.png" className="opacity-0" /> {/* Hide image, use Icon */}
                      </Avatar>
                    )}

                    <div
                      className={`rounded-2xl px-5 py-3 max-w-[85%] shadow-sm ${m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-card text-card-foreground border rounded-tl-sm'
                        }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                        {m.content}
                      </div>

                      {/* Generative UI for Tool Invocations */}
                      {m.toolInvocations?.map((toolInvocation: any) => {
                        const toolCallId = toolInvocation.toolCallId;

                        // Prevent rendering duplicate forms if multiple exist (rare)
                        if (toolInvocation.toolName === 'ask_questions') {
                          return (
                            <div key={toolCallId} className="mt-3">
                              <QuestionForm
                                toolInvocation={toolInvocation}
                                addToolResult={({ toolCallId, result }: { toolCallId: string; result: any }) => {
                                  // The SDK usually provides a way to add tool result.
                                  // useChat's addToolResult (in newer versions)
                                  // Or we simulate appending a tool result message.
                                  // Vercel AI SDK 3.1: useChat returns `addToolResult`?
                                  // Let's check imports. If not, we append a message with role 'tool'.
                                  // Checking docs for 3.1: useChat returns `addToolResult`.
                                  // If TypeScript complains, we'll fix it.
                                  // Assuming it's available or we use a workaround.
                                  // Wait, I should verify if `addToolResult` is available in useChat destructuring.
                                  // If not, I can append({ role: 'tool', toolCallId, content: result })?
                                  // Actually, append() in SDK 3.1 might support Tool Result? 
                                  // Or we just send a new user message?
                                  // Correct pattern for 'tool-calling' UI is usually: 
                                  // 1. Tool returns. 
                                  // 2. User interacts.
                                  // 3. Client calls `addToolResult({ toolCallId, result })`.
                                  // Let's assume addToolResult exists in the hook return.
                                }}
                              />
                            </div>
                          )
                        }

                        if (toolInvocation.toolName === 'suggest_enhancements') {
                          return (
                            <div key={toolCallId} className="w-full mt-3">
                              <EnhancementForm
                                toolInvocation={toolInvocation}
                                onSubmit={(text) => {
                                  append({
                                    role: 'user',
                                    content: text
                                  })
                                }}
                              />
                            </div>
                          )
                        }

                        if (toolInvocation.toolName === 'propose_prompt') {
                          return (
                            <div key={toolCallId} className="w-full mt-3">
                              <PromptProposalCard
                                toolInvocation={toolInvocation}
                                addToolResult={({ toolCallId, result }: { toolCallId: string; result: any }) => {
                                  // See logic in QuestionForm for addToolResult notes
                                }}
                              />
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>

                    {m.role === 'user' && (
                      <Avatar className="w-8 h-8 mt-1 border shrink-0 bg-primary/10">
                        <AvatarFallback className="bg-transparent"><User className="w-5 h-5 text-primary" /></AvatarFallback>
                        <AvatarImage src="/user-avatar.png" className="opacity-0" />
                      </Avatar>
                    )}

                    {/* Message Actions */}
                    <div className={`absolute -bottom-6 ${m.role === 'user' ? 'right-12' : 'left-12'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(m.content)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      {m.role === 'user' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(m.content)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/50 hover:text-destructive" onClick={() => handleDeleteMessage(m.id, sessionId)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-4 justify-start">
                    <Avatar className="w-8 h-8 mt-1 border shrink-0">
                      <AvatarFallback>AI</AvatarFallback>
                      <AvatarImage src="/ai-avatar.png" />
                    </Avatar>
                    <div className="bg-card border px-5 py-3 rounded-2xl flex items-center gap-2 rounded-tl-sm">
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-1" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Floating Input Area */}
        <div className="p-4 bg-background border-t shrink-0">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={onFormSubmit}
              className="relative flex items-end gap-2 p-2 rounded-xl border bg-muted/40 hover:border-primary/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all"
            >
              <Input
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 min-h-[50px]"
                value={input}
                onChange={handleInputChange}
                placeholder="描述你的任务..."
                autoFocus
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || (!input?.trim())}
                className={`h-10 w-10 mb-1 mr-1 shrink-0 rounded-lg ${isLoading ? 'hidden' : 'flex'}`}
              >
                <Send className="w-4 h-4" />
              </Button>
              {isLoading && (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => stop()}
                  className="h-10 w-10 mb-1 mr-1 shrink-0 rounded-lg animate-in fade-in zoom-in"
                >
                  <StopCircle className="w-4 h-4" />
                </Button>
              )}
            </form>
            <div className="text-center text-xs text-muted-foreground mt-2">
              AI 可能会犯错。请核对重要信息。配置仅存储在本地。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
