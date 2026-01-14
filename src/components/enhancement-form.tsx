'use client'

import { useState } from 'react'
import { Send, Sparkles, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface EnhancementOption {
    label: string
    value: string
    description?: string
}

interface EnhancementDimension {
    key: string
    title: string
    options: EnhancementOption[]
    allowCustom: boolean
}

interface EnhancementFormProps {
    toolInvocation: any
    addToolResult?: (result: { toolCallId: string; result: any }) => void
    onSubmit?: (text: string) => void
}

export function EnhancementForm({ toolInvocation, addToolResult, onSubmit }: EnhancementFormProps) {
    const { toolCallId, args } = toolInvocation
    const [selections, setSelections] = useState<Record<string, string>>({})
    const [customInputs, setCustomInputs] = useState<Record<string, string>>({})
    const [submitted, setSubmitted] = useState(false)

    // Parse args safely
    let formConfig: { dimensions: EnhancementDimension[] } | null = null
    try {
        formConfig = typeof args === 'string' ? JSON.parse(args) : args
    } catch (e) {
        // Partial JSON
    }

    if (!formConfig || !formConfig.dimensions) {
        return (
            <Card className="flex items-center justify-center p-6 border-dashed animate-pulse">
                <Sparkles className="w-5 h-5 text-primary animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">正在分析优化维度...</span>
            </Card>
        )
    }

    const handleSelect = (dimKey: string, value: string) => {
        setSelections(prev => {
            const newSel = { ...prev }
            if (newSel[dimKey] === value) {
                delete newSel[dimKey] // Toggle off
            } else {
                newSel[dimKey] = value
            }
            return newSel
        })
    }

    const handleSubmit = () => {
        setSubmitted(true)

        // Construct detailed feedback
        const feedbackParts: string[] = []

        formConfig?.dimensions.forEach(dim => {
            const selectedVal = selections[dim.key]
            const customVal = customInputs[dim.key]

            if (customVal && customVal.trim()) {
                feedbackParts.push(`【${dim.title}】: 用户自定义 - ${customVal}`)
            } else if (selectedVal) {
                const opt = dim.options.find(o => o.value === selectedVal)
                feedbackParts.push(`【${dim.title}】: ${opt?.label || selectedVal}`)
            }
            // If neither, implied "Skip/No Change"
        })

        if (feedbackParts.length === 0) {
            feedbackParts.push("用户没有选择任何特定修改，请基于当前理解直接生成最终文档。")
        } else {
            feedbackParts.push("请根据以上选择，生成最终的结构化 Prompt 文档。")
        }

        if (onSubmit) {
            onSubmit(feedbackParts.join('\n'))
        } else if (addToolResult) {
            addToolResult({
                toolCallId,
                result: feedbackParts.join('\n')
            })
        }
    }

    if (submitted || 'result' in toolInvocation) {
        return (
            <Card className="bg-muted/10 border-dashed">
                <CardContent className="p-4 flex items-center gap-2 text-muted-foreground">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">已提交优化方向，正在生成最终文档...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full border-primary/20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CardHeader className="bg-primary/5 pb-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">优化方向建议</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">请选择您希望改进的维度（未选择将保持默认）</p>
            </CardHeader>

            <CardContent className="p-0">
                <div className="flex flex-col">
                    {formConfig.dimensions.map((dim, idx) => (
                        <div key={dim.key} className="p-4 hover:bg-muted/10 transition-colors">
                            <div className="mb-3 flex items-center justify-between">
                                <Label className="text-sm font-semibold text-foreground/80">{dim.title}</Label>
                                {selections[dim.key] && (
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                        已选
                                    </Badge>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {dim.options.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant={selections[dim.key] === opt.value ? "default" : "outline"}
                                        size="sm"
                                        className={`h-8 text-xs ${selections[dim.key] === opt.value ? 'shadow-md scale-105' : 'text-muted-foreground border-muted-foreground/30'}`}
                                        onClick={() => handleSelect(dim.key, opt.value)}
                                        title={opt.description}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>

                            {dim.allowCustom && (
                                <Input
                                    placeholder="其他 (输入自定义要求)..."
                                    className="h-8 text-xs bg-transparent border-input/50 focus-visible:ring-primary/20"
                                    value={customInputs[dim.key] || ''}
                                    onChange={(e) => setCustomInputs(prev => ({ ...prev, [dim.key]: e.target.value }))}
                                />
                            )}

                            {idx < (formConfig?.dimensions.length || 0) - 1 && <Separator className="mt-4 opacity-50" />}
                        </div>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="bg-muted/30 p-4 border-t sticky bottom-0 z-10">
                <Button className="w-full gap-2 shadow-lg" onClick={handleSubmit}>
                    <Send className="w-4 h-4" />
                    生成最终 Prompt 文档
                </Button>
            </CardFooter>
        </Card>
    )
}
