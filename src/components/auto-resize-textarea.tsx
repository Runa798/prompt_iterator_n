'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AutoResizeTextareaProps {
  value: string
  onChange: (value: string) => void
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  onSubmit?: () => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

export function AutoResizeTextarea({
  value,
  onChange,
  onPaste,
  onSubmit,
  placeholder,
  disabled,
  autoFocus,
  className = '',
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showExpandButton, setShowExpandButton] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // 处理键盘事件：回车发送，Shift+回车换行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (onSubmit && value.trim()) {
        onSubmit()
      }
    }
  }

  // 确保组件已挂载，避免 hydration 错误
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 重置高度以获取正确的 scrollHeight
    textarea.style.height = 'auto'

    // 计算最大高度（屏幕高度的 1/4，更大的显示空间）
    const maxHeight = Math.max(window.innerHeight / 4, 150)
    const scrollHeight = textarea.scrollHeight

    // 设置实际高度
    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`
    } else {
      textarea.style.height = `${scrollHeight}px`
    }

    // 只在客户端挂载后才更新展开按钮状态
    if (isMounted) {
      // 计算单行高度：minHeight(50px) + padding(上下各3px) = 56px
      const singleLineHeight = 56
      const hasMultipleLines = value.includes('\n') || scrollHeight > singleLineHeight
      setShowExpandButton(hasMultipleLines)
    }
  }, [value, isMounted])

  return (
    <>
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 leading-relaxed ${className}`}
          rows={1}
          style={{
            lineHeight: '1.6',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
            minHeight: '50px'
          }}
        />

        {showExpandButton && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setIsExpanded(true)}
            className="absolute right-2 top-2 h-8 w-8 rounded-md bg-background/80 backdrop-blur-sm hover:bg-muted shadow-sm transition-all animate-in fade-in zoom-in z-10"
            title="展开输入框 (查看完整内容)"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 放大对话框 */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-5xl w-[90vw] h-[90vh] flex flex-col p-0 border-4">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">Pasted content</DialogTitle>
            <div className="text-xs text-muted-foreground mt-1">
              {value.length} 字符 • {value.split('\n').length} 行
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 py-4">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full h-full resize-none leading-relaxed border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
              style={{
                lineHeight: '1.6',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                whiteSpace: 'pre-wrap'
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
