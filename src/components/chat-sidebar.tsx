'use client'

import { useEffect, useState } from 'react'
import { Plus, MessageSquare, Trash2, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { db, type ChatSession } from '@/lib/db'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ChatSidebarProps {
    currentSessionId: number | null
    onSessionSelect: (id: number) => void
    onNewChat: () => void
}

export function ChatSidebar({ currentSessionId, onSessionSelect, onNewChat }: ChatSidebarProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [isOpen, setIsOpen] = useState(false)

    const loadSessions = async () => {
        const allSessions = await db.chatSessions.orderBy('updatedAt').reverse().toArray()
        setSessions(allSessions)
    }

    useEffect(() => {
        loadSessions()
        // Simple polling or event listener could be better, but for now load on mount
        // and we can expose a reload method if needed, or rely on parent updates?
        // Actually, dexie `useLiveQuery` is best but without it, we might just poll or
        // rely on parent triggering re-renders if we move state up.
        // Let's stick to simple effect for now.
    }, [])

    // Listen to custom event for DB updates if we want to be fancy, or just refresh often.
    // For MVP, valid to refresh when list changes.
    useEffect(() => {
        // Hacky execution: refresh every 2 seconds to catch updates from main thread
        const interval = setInterval(loadSessions, 2000)
        return () => clearInterval(interval)
    }, [])

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation()
        e.preventDefault()
        if (confirm('确定要删除这条记录吗？')) {
            try {
                await db.messages.where('sessionId').equals(id).delete()
                await db.chatSessions.delete(id)
                await loadSessions()
                if (currentSessionId === id) {
                    onNewChat()
                }
                toast.success('对话已删除')
            } catch (error) {
                console.error("Failed to delete session:", error)
                toast.error('删除失败')
            }
        }
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full py-4">
            <div className="px-4 mb-4">
                <Button
                    className="w-full justify-start gap-2"
                    variant="outline"
                    onClick={() => {
                        onNewChat()
                        setIsOpen(false)
                    }}
                >
                    <Plus className="w-4 h-4" />
                    新对话
                </Button>
            </div>

            <ScrollArea className="flex-1 px-4">
                <div className="flex flex-col gap-2">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${currentSessionId === session.id
                                ? 'bg-secondary border-primary/20'
                                : 'hover:bg-muted/50 border-transparent'
                                }`}
                            onClick={() => {
                                onSessionSelect(session.id!)
                                setIsOpen(false)
                            }}
                        >
                            <div className="flex flex-col gap-1 overflow-hidden">
                                <span className="font-medium text-sm truncate">
                                    {session.title || '未命名对话'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(session.updatedAt, { addSuffix: true, locale: zhCN })}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                                onClick={(e) => handleDelete(e, session.id!)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}

                    {sessions.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            暂无历史记录
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 border-r flex-col bg-card/30 shrink-0">
                <SidebarContent />
            </div>

            {/* Mobile Sidebar */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden absolute left-4 top-4 z-20">
                        <Menu className="w-5 h-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    <SidebarContent />
                </SheetContent>
            </Sheet>
        </>
    )
}
