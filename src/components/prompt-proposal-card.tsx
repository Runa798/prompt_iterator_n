'use client'

import { useState } from 'react'
import { Copy, Check, RefreshCw, Sparkles, Send } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PromptProposal {
    title: string
    role: string
    objective: string
    context: string
    constraints: string
    workflow: string
    variables: string[]
    final_prompt: string
}

interface PromptProposalCardProps {
    toolInvocation: any
    addToolResult: (result: { toolCallId: string; result: any }) => void
}

export function PromptProposalCard({ toolInvocation, addToolResult }: PromptProposalCardProps) {
    const { toolCallId, args } = toolInvocation
    const [copied, setCopied] = useState(false)
    const [accepted, setAccepted] = useState(false)

    // Parse args safely
    let proposal: PromptProposal | null = null
    try {
        proposal = typeof args === 'string' ? JSON.parse(args) : args
    } catch (e) {
        // Partial JSON during streaming
    }

    if (!proposal || !proposal.title) {
        return (
            <Card className="flex items-center justify-center p-6 border-dashed animate-pulse">
                <Sparkles className="w-5 h-5 text-primary animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">正在生成结构化提示词...</span>
            </Card>
        )
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(proposal?.final_prompt || '')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleAccept = () => {
        setAccepted(true)
        addToolResult({
            toolCallId,
            result: "User accepted the prompt proposal."
        })
    }

    const handleIterate = () => {
        // Technically this should trigger a user message?
        // Or we just send a result saying "I want changes"?
        // For now, let's just make it a visual action that tells user to type.
    }

    if (accepted || 'result' in toolInvocation) {
        return (
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="py-4">
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">已采纳提示词方案：{proposal.title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="py-2">
                    <div className="text-sm text-muted-foreground line-clamp-2">
                        {proposal.final_prompt}
                    </div>
                </CardContent>
                <CardFooter className="py-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                        复制全文
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="w-full border-primary/50 shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CardHeader className="bg-muted/30 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">{proposal.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-background">结构化建议</Badge>
                </div>
            </CardHeader>

            <Tabs defaultValue="preview" className="w-full">
                <div className="px-6 border-b bg-muted/10">
                    <TabsList className="h-10 bg-transparent p-0">
                        <TabsTrigger value="preview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                            预览视图
                        </TabsTrigger>
                        <TabsTrigger value="structure" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
                            结构详情
                        </TabsTrigger>
                    </TabsList>
                </div>

                <CardContent className="p-0">
                    <TabsContent value="preview" className="m-0">
                        <div className="p-6 bg-card">
                            <Label className="mb-2 block text-muted-foreground">最终生成的 Prompt</Label>
                            <div className="relative">
                                <Textarea
                                    className="min-h-[200px] font-mono text-sm leading-relaxed bg-muted/20 resize-none focus-visible:ring-1"
                                    value={proposal.final_prompt}
                                    readOnly
                                />
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="absolute top-2 right-2 h-8 w-8 opacity-80 hover:opacity-100"
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="structure" className="m-0 p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Role (角色)</Label>
                                <div className="p-3 bg-muted/30 rounded-md text-sm">{proposal.role}</div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-muted-foreground">Objective (目标)</Label>
                                <div className="p-3 bg-muted/30 rounded-md text-sm">{proposal.objective}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Context (背景)</Label>
                            <div className="p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap">{proposal.context}</div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Workflow (工作流)</Label>
                            <div className="p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap">{proposal.workflow || '无特定步骤'}</div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Constraints (约束)</Label>
                            <div className="p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap border-l-2 border-destructive pl-3">{proposal.constraints}</div>
                        </div>
                    </TabsContent>
                </CardContent>
            </Tabs>

            <CardFooter className="bg-muted/30 p-4 flex justify-between gap-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    若需修改，请直接在对话框输入反馈
                </div>
                <div className="flex gap-2">
                    <Button variant="default" onClick={handleAccept} className="gap-2">
                        <Check className="w-4 h-4" />
                        采纳此版本
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}
