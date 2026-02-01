import React, { useEffect, useState } from 'react';
import { databases, COLLECTIONS, DATABASE_ID, Query } from '../lib/appwrite';

export const DebugMigration: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState('Idle');

    const log = (msg: string) => setLogs(prev => [...prev, msg]);

    useEffect(() => {
        const runMigration = async () => {
            setStatus('Running');
            log('🚀 Starting Migration from Browser...');

            try {
                // 1. Fetch all messages
                log('Fetching messages...');
                let messages: any[] = [];
                let cursor = null;

                while (true) {
                    const queries = [Query.limit(100)];
                    if (cursor) queries.push(Query.cursorAfter(cursor));

                    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.MESSAGES, queries);
                    messages.push(...res.documents);

                    if (res.documents.length < 100) break;
                    cursor = res.documents[res.documents.length - 1].$id;
                }
                log(`Found ${messages.length} messages.`);

                // 2. Group by Chat ID
                const chats: Record<string, any[]> = {};
                for (const msg of messages) {
                    if (!chats[msg.chatId]) {
                        chats[msg.chatId] = [];
                    }
                    chats[msg.chatId].push(msg);
                }

                // 3. Process each chat
                for (const chatId of Object.keys(chats)) {
                    if (!chatId.includes('_') && chatId !== 'TEAM' && !chatId.startsWith('team_')) {
                        continue;
                    }
                    if (chatId === 'TEAM' || chatId === 'TEAM_PENDING' || chatId === 'NO_USER') {
                        continue;
                    }

                    const msgs = chats[chatId];
                    msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    const lastMsg = msgs[0];
                    const participants = chatId.split('_');

                    if (participants.length !== 2) continue;

                    log(`Processing ${chatId}...`);

                    try {
                        // Try to create
                        await databases.createDocument(
                            DATABASE_ID,
                            COLLECTIONS.CONVERSATIONS,
                            chatId,
                            {
                                participants: participants,
                                lastMessage: lastMsg.text.substring(0, 100),
                                lastMessageAt: lastMsg.timestamp,
                                unreadCount: 0
                            }
                        );
                        log(`  ✅ Created conversation for ${chatId}`);
                    } catch (e: any) {
                        if (e.code === 409) {
                            // Update if exists
                            await databases.updateDocument(
                                DATABASE_ID,
                                COLLECTIONS.CONVERSATIONS,
                                chatId,
                                {
                                    lastMessage: lastMsg.text.substring(0, 100),
                                    lastMessageAt: lastMsg.timestamp
                                }
                            );
                            log(`  ℹ️ Updated conversation for ${chatId}`);
                        } else {
                            log(`  ❌ Error: ${e.message}`);
                        }
                    }
                }

                log('✅ Migration Complete!');
                setStatus('Complete');

            } catch (e: any) {
                log(`CRITICAL ERROR: ${e.message}`);
                setStatus('Error');
            }
        };

        runMigration();
    }, []);

    return (
        <div className="fixed inset-0 bg-black text-green-400 p-8 font-mono z-[9999] overflow-auto">
            <h1 className="text-xl font-bold mb-4">Migration Debugger ({status})</h1>
            <div className="flex flex-col gap-1">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
};
