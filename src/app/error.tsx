'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application error:', error)
    }, [error])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background p-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-2">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">应用遇到了问题</h2>
                <p className="text-muted-foreground max-w-[500px]">
                    {error.message || "发生了一个未知错误，导致页面无法渲染。"}
                </p>
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-4 bg-muted rounded-lg text-left w-full max-w-[600px] overflow-auto max-h-[200px] text-xs font-mono">
                        {error.stack}
                    </div>
                )}
            </div>
            <Button onClick={() => reset()} variant="default" size="lg">
                尝试恢复
            </Button>
        </div>
    )
}
