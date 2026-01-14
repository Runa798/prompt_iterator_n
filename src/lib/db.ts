import Dexie, { type Table } from 'dexie';


export interface ChatSession {
    id?: number;
    title: string;
    previewText: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ChatMessage {
    id?: number;
    sessionId: number;
    role: 'user' | 'assistant' | 'system' | 'data';
    content: string;
    createdAt: Date;
    // Vercel AI SDK specific fields
    toolInvocations?: any[];
    data?: any;
    annotations?: any[];
}

export class PromptIteratorDB extends Dexie {
    chatSessions!: Table<ChatSession>;
    messages!: Table<ChatMessage>;

    constructor() {
        super('PromptIteratorDB');
        this.version(1).stores({
            chatSessions: '++id, title, updatedAt, createdAt',
            messages: '++id, sessionId, role, createdAt'
        });
    }
}

export const db = new PromptIteratorDB();
