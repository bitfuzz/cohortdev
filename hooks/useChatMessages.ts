import { useState, useEffect, useRef } from 'react';
import { client, databases, COLLECTIONS, DATABASE_ID, ID, Query } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import { Team } from '../types';

export interface Message {
    $id: string;
    senderId: string;
    text: string;
    timestamp: string;
    chatId: string;
}

export const useChatMessages = (activeChat: string | 'TEAM', myTeam: Team | null) => {
    const { user: currentUser } = useAuth();
    const [messageCache, setMessageCache] = useState<Record<string, Message[]>>({});
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messages = currentConversationId ? (messageCache[currentConversationId] || []) : [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Resolve Conversation ID
    useEffect(() => {
        if (!currentUser) return;
        if (activeChat === 'TEAM') {
            setCurrentConversationId(myTeam ? myTeam.$id : null);
            return;
        }

        const resolveConversation = async () => {
            try {
                // Query for existing conversation between these two users
                const res = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.CONVERSATIONS,
                    [
                        Query.contains('participants', [currentUser.$id]), // Contains Me
                        // We filter for the other user in memory or secondary query if needed, 
                        // but Appwrite SDK might not support double 'contains' on same attr easily in all versions.
                        // Let's try explicit AND query if supported, or filter client side from a loose query.
                        // Actually, simplified: create a deterministic signature? No, invalid chars.
                        // Best approach: Query where participants contains currentUser.$id
                    ]
                );

                // Client-side filtering to find the exact match
                const match = res.documents.find(doc => {
                    const parts = doc.participants as string[];
                    return parts.length === 2 && parts.includes(activeChat) && parts.includes(currentUser.$id);
                });

                if (match) {
                    setCurrentConversationId(match.$id);
                } else {
                    setCurrentConversationId(null); // No conversation yet
                }
            } catch (e) {
                console.error("Failed to resolve conversation", e);
                setCurrentConversationId(null);
            }
        };

        resolveConversation();
    }, [activeChat, currentUser, myTeam]);


    // Listen for Messages
    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
            (response) => {
                if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                    const payload = response.payload as Message;

                    // If we don't know the conversation ID yet, but this message looks like it belongs to us?
                    // It's tricky. Easier to just blindly update cache if we have the key.
                    // Or if this matches our current active chat context?

                    setMessageCache(prev => {
                        const chatMsgList = prev[payload.chatId] || [];
                        if (chatMsgList.some(m => m.$id === payload.$id)) return prev;

                        // If this is the FIRST message and we just created the convo, we might need to recognize it
                        if (!currentConversationId && payload.senderId === currentUser.$id) {
                            // We initiated, so we likely set the cache optimistically, handled in sendMessage
                        }

                        return {
                            ...prev,
                            [payload.chatId]: [...chatMsgList, payload]
                        };
                    });
                }
            }
        );

        return () => {
            unsubscribe();
        };
    }, [currentUser, currentConversationId]);

    // Fetch Messages when Conversation ID is known
    useEffect(() => {
        const fetchMessages = async () => {
            if (!currentConversationId) return;

            try {
                const res = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.MESSAGES,
                    [
                        Query.equal('chatId', currentConversationId),
                        Query.orderAsc('timestamp')
                    ]
                );
                setMessageCache(prev => ({
                    ...prev,
                    [currentConversationId]: res.documents as unknown as Message[]
                }));
            } catch (e) {
                console.error("Error loading messages", e);
            }
        };

        fetchMessages();
    }, [currentConversationId]);


    const sendMessage = async (text: string, blockedUsers: Set<string>) => {
        if (!text.trim() || !currentUser) return;

        if (typeof activeChat === 'string' && activeChat !== 'TEAM' && blockedUsers.has(activeChat)) {
            throw new Error("You cannot message a blocked user");
        }

        if (activeChat === 'TEAM' && (!myTeam)) {
            throw new Error("You need to be part of a team to chat here!");
        }

        // Determine effective Chat ID (create if missing)
        let effectiveChatId = currentConversationId;

        if (!effectiveChatId) {
            if (activeChat === 'TEAM') return; // Should have been set by effect

            // Create New Conversation
            try {
                const newDoc = await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.CONVERSATIONS,
                    ID.unique(),
                    {
                        participants: [currentUser.$id, activeChat],
                        lastMessage: text,
                        lastMessageAt: new Date().toISOString(),
                        unreadCount: 1
                    }
                );
                effectiveChatId = newDoc.$id;
                setCurrentConversationId(effectiveChatId);
            } catch (e) {
                console.error("Failed to create conversation", e);
                throw e;
            }
        } else {
            // Update Existing Conversation
            if (activeChat !== 'TEAM') {
                try {
                    await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTIONS.CONVERSATIONS,
                        effectiveChatId,
                        {
                            lastMessage: text,
                            lastMessageAt: new Date().toISOString(),
                            unreadCount: 0 // Reset or increment logic should be server side usually, but simple here
                        }
                    );
                } catch (e) {
                    console.error("Failed to update conversation", e);
                }
            }
        }

        const payload = {
            chatId: effectiveChatId!,
            senderId: currentUser.$id,
            text: text,
            timestamp: new Date().toISOString(),
        };

        // Optimistic update
        const tempId = ID.unique();
        const optimisticMsg = { ...payload, $id: tempId };

        setMessageCache(prev => ({
            ...prev,
            [effectiveChatId!]: [...(prev[effectiveChatId!] || []), optimisticMsg]
        }));

        try {
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.MESSAGES,
                tempId, // Use tempId (ID) to match optimistic ID
                payload
            );

            // Replace optimistic (ID matches, so just ensuring content sync)
            setMessageCache(prev => ({
                ...prev,
                [effectiveChatId!]: (prev[effectiveChatId!] || []).map(m => m.$id === tempId ? (response as unknown as Message) : m)
            }));

        } catch (error) {
            console.error("Send failed", error);
            setMessageCache(prev => ({
                ...prev,
                [effectiveChatId!]: (prev[effectiveChatId!] || []).filter(m => m.$id !== tempId)
            }));
            throw error;
        }
    };

    return { messages, sendMessage, messagesEndRef };
};
