import React, { useEffect, useState } from 'react';
import { databases, COLLECTIONS, DATABASE_ID, Query, ID } from '../lib/appwrite';

export const MigrationRunner: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState('Idle');

    const log = (msg: string) => setLogs(prev => [...prev, msg]);

    useEffect(() => {
        const runMigration = async () => {
            if (status !== 'Idle') return;
            setStatus('Running');
            log('🚀 Starting Migration: Messages -> Conversations...');

            try {
                // 1. Fetch all messages
                log('Fetching all messages...');
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
                const chatIds = Object.keys(chats);
                log(`Found ${chatIds.length} unique chat threads.`);

                for (const chatId of chatIds) {
                    // Skip invalid IDs
                    if (!chatId.includes('_') && chatId !== 'TEAM' && !chatId.startsWith('team_')) {
                        continue;
                    }
                    if (chatId === 'TEAM' || chatId === 'TEAM_PENDING' || chatId === 'NO_USER') {
                        continue;
                    }

                    const msgs = chats[chatId];
                    // Sort desc
                    msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    const lastMsg = msgs[0];
                    const participants = chatId.split('_');

                    if (participants.length !== 2) continue;

                    log(`Processing ${chatId}...`);

                    try {
                        // Check if conversation already exists for these participants
                        const existing = await databases.listDocuments(
                            DATABASE_ID,
                            COLLECTIONS.CONVERSATIONS,
                            [
                                Query.contains('participants', participants[0]),
                                // We can't easily do an exact match on array with two elements in one query without complex logic
                                // So we'll fetch potential matches and filter in memory, or just rely on the fact that 
                                // if we find a doc where both are participants, that's the one.
                            ]
                        );

                        // Find exact match
                        let conversationId = null;
                        const match = existing.documents.find(doc =>
                            doc.participants.includes(participants[0]) &&
                            doc.participants.includes(participants[1]) &&
                            doc.participants.length === 2
                        );

                        if (match) {
                            conversationId = match.$id;
                            // Update existing
                            await databases.updateDocument(
                                DATABASE_ID,
                                COLLECTIONS.CONVERSATIONS,
                                conversationId,
                                {
                                    lastMessage: lastMsg.text.substring(0, 100),
                                    lastMessageAt: lastMsg.timestamp
                                }
                            );
                            log(`  ℹ️ Updated conversation for ${chatId}`);
                        } else {
                            // Create new with unique ID
                            await databases.createDocument(
                                DATABASE_ID,
                                COLLECTIONS.CONVERSATIONS,
                                ID.unique(),
                                {
                                    participants: participants,
                                    lastMessage: lastMsg.text.substring(0, 100),
                                    lastMessageAt: lastMsg.timestamp,
                                    unreadCount: 0
                                }
                            );
                            log(`  ✅ Created conversation for ${chatId}`);
                        }
                    } catch (e: any) {
                        log(`  ❌ Error processing ${chatId}: ${e.message}`);
                    }
                }

                log('✅ Migration Complete! You can now ask the AI to remove this screen.');
                setStatus('Complete');

            } catch (e: any) {
                log(`CRITICAL ERROR: ${e.message}`);
                setStatus('Error');
            }
        };



        runMigration();
    }, []);

    if (status === 'Closed') return null;

    return (
        <div className="fixed inset-0 bg-black/90 text-green-400 p-8 font-mono z-[9999] overflow-auto flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-green-900 pb-4">
                <h1 className="text-xl font-bold">System Migration ({status})</h1>
                <button
                    onClick={() => setStatus('Closed')}
                    className="px-4 py-2 bg-green-900 text-green-100 rounded hover:bg-green-800 transition-colors"
                >
                    Close & Return to App
                </button>
            </div>
            <div className="flex-1 overflow-auto flex flex-col gap-1 text-xs font-mono">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
};
