import React, { useState, useEffect } from 'react';

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const API_KEY = import.meta.env.VITE_APP_DEBUG_API_KEY;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

export const DebugSetup: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const runSetup = async () => {
        addLog('Starting setup...');
        const headers = {
            'X-Appwrite-Project': PROJECT_ID,
            'X-Appwrite-Key': API_KEY,
            'Content-Type': 'application/json',
        };

        try {
            // Check Collection
            addLog('Checking "conversations" collection...');
            const checkRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/conversations`, { headers });

            if (checkRes.ok) {
                addLog('✅ Collection already exists.');
            } else {
                addLog(`Collection missing (${checkRes.status}). Creating...`);
                const createRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        collectionId: 'conversations',
                        name: 'Conversations',
                        permissions: [
                            'read("any")',
                            'create("users")',
                            'update("users")',
                            'delete("users")',
                        ],
                        documentSecurity: true,
                    })
                });

                if (createRes.ok) {
                    addLog('✅ Collection CREATED.');
                } else {
                    addLog(`❌ Failed to create collection: ${createRes.status}`);
                    addLog(await createRes.text());
                    return;
                }
            }

            // Attributes
            const attrs = [
                { type: 'string', key: 'participants', size: 128, required: true, array: true },
                { type: 'string', key: 'lastMessage', size: 5000, required: false },
                { type: 'datetime', key: 'lastMessageAt', required: true },
                { type: 'integer', key: 'unreadCount', required: false, default: 0 },
            ];

            for (const attr of attrs) {
                addLog(`Checking attribute: ${attr.key}...`);
                // Try to create directly, ignore 409 (conflict)
                let path = `/databases/${DATABASE_ID}/collections/conversations/attributes/${attr.type}`;
                const body: any = {
                    key: attr.key,
                    required: attr.required,
                    array: attr.array || false,
                };
                if (attr.type === 'string') body.size = attr.size;
                if (attr.default !== undefined) body.default = attr.default;

                const res = await fetch(`${ENDPOINT}${path}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    addLog(`✅ Attribute ${attr.key} created.`);
                } else if (res.status === 409) {
                    addLog(`ℹ️ Attribute ${attr.key} already exists.`);
                } else {
                    addLog(`❌ Attribute ${attr.key} failed: ${res.status}`);
                    addLog(await res.text());
                }
                await new Promise(r => setTimeout(r, 500));
            }

            // Index
            addLog(`Checking Index: participants_idx...`);
            const indexRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/conversations/indexes`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    key: 'participants_idx',
                    type: 'key',
                    attributes: ['participants'],
                })
            });
            if (indexRes.ok) {
                addLog(`✅ Index created.`);
            } else if (indexRes.status === 409) {
                addLog(`ℹ️ Index already exists.`);
            } else {
                addLog(`❌ Index failed: ${indexRes.status}`);
            }

            addLog('🎉 Setup Complete!');

        } catch (e: any) {
            addLog(`ERROR: ${e.message}`);
        }
    };

    useEffect(() => {
        runSetup();
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 text-green-400 font-mono p-8 overflow-auto">
            <h1 className="text-xl font-bold mb-4">Debug Setup</h1>
            <div className="flex flex-col gap-1">
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>
            <button
                onClick={() => window.location.reload()}
                className="mt-8 px-4 py-2 bg-green-600 text-black font-bold rounded"
            >
                Reload App
            </button>
        </div>
    );
};
