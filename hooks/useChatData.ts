import { useState, useEffect, useRef, useCallback } from 'react';
import { client, databases, COLLECTIONS, DATABASE_ID, Query } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import { User, Invite, Team } from '../types';

export const useChatData = (activeChatId?: string | 'TEAM') => {
    const { user: currentUser, userProfile, checkUser } = useAuth();
    const [chatUsers, setChatUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [prevActiveChatId, setPrevActiveChatId] = useState(activeChatId);
    const [myTeam, setMyTeam] = useState<Team | null>(null);
    const [incomingInvites, setIncomingInvites] = useState<Invite[]>([]);
    const [invitedUsers, setInvitedUsers] = useState<Map<string, string>>(new Map());

    // We track prevActiveChatId to know when it changes, but we DON'T want to wipe the UI with a loading screen.
    if (activeChatId !== prevActiveChatId) {
        setPrevActiveChatId(activeChatId);
        // Do NOT set loadingUsers(true) here. It causes the flash.
    }

    // Stable ref for fetchData to avoid re-subscribing when fetch logic changes
    const fetchRef = useRef<() => void>(() => { });

    const fetchData = useCallback(async () => {
        // Only show loading if we don't have data yet (initial load)
        if (chatUsers.length === 0) setLoadingUsers(true);

        if (!currentUser) return;
        try {
            // 1. Fetch Conversations (where I am a participant)
            // We use the 'participants' array attribute.
            const conversationsRes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.CONVERSATIONS,
                [
                    Query.equal('participants', currentUser.$id),
                    Query.orderDesc('lastMessageAt')
                ]
            );

            // 2. Extract User IDs
            const userIds = new Set<string>();
            conversationsRes.documents.forEach(doc => {
                const participants = doc.participants as string[];
                participants.forEach(id => {
                    if (id !== currentUser.$id) userIds.add(id);
                });
            });

            // 3. Ensure Active Chat User is included (if coming from Feed)
            if (activeChatId && activeChatId !== 'TEAM' && !userIds.has(activeChatId)) {
                userIds.add(activeChatId);
            }

            // 4. Fetch User Profiles
            if (userIds.size > 0) {
                // Appwrite doesn't support "where id in [...]" efficiently for large lists,
                // but for a chat list it's usually manageable.
                // We can use Query.equal('$id', [...ids]) if supported, or multiple requests.
                // Appwrite supports Query.equal('$id', [array]).
                const idsArray = Array.from(userIds);

                const usersRes = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.USERS,
                    [Query.equal('$id', idsArray)]
                );

                const users = usersRes.documents.map(doc => ({
                    id: doc.$id,
                    name: doc.name,
                    avatar: doc.avatar,
                    role: doc.role,
                    status: doc.status,
                    isOnline: doc.isOnline,
                    teamId: doc.teamId,
                    handle: doc.handle || '',
                    bio: doc.bio || '',
                    tags: doc.tags || [],
                    stack: doc.stack || [],
                    githubActivity: []
                })) as User[];

                // Sort users by the order they appeared in conversations (idsArray)
                users.sort((a, b) => idsArray.indexOf(a.id) - idsArray.indexOf(b.id));


                setChatUsers(users);
            } else {
                setChatUsers([]);
            }
            setLoadingUsers(false);

            // Fetch My Team
            if (userProfile?.teamId) {
                try {
                    const teamRes = await databases.getDocument(DATABASE_ID, COLLECTIONS.TEAMS, userProfile.teamId);
                    setMyTeam({
                        $id: teamRes.$id,
                        name: teamRes.name,
                        members: teamRes.members,
                        ownerId: teamRes.ownerId,
                        adminId: teamRes.adminId || teamRes.ownerId,
                        createdAt: teamRes.createdAt
                    } as unknown as Team);
                } catch (e) {
                    console.error("Team not found", e);
                    await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, currentUser.$id, { teamId: null });
                    await checkUser();
                }
            } else {
                setMyTeam(null);
            }

            // Fetch Invites
            const invitesRes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.INVITES,
                [Query.equal('receiverId', currentUser.$id), Query.equal('status', 'pending')]
            );
            setIncomingInvites(invitesRes.documents as unknown as Invite[]);
            console.log("Fetched Invites:", invitesRes.documents.length);

            // Fetch My Sent Invites
            const sentInvitesRes = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.INVITES,
                [Query.equal('senderId', currentUser.$id), Query.equal('status', 'pending')]
            );
            const sentMap = new Map();
            sentInvitesRes.documents.forEach(doc => sentMap.set(doc.receiverId, doc.$id));
            setInvitedUsers(sentMap);

        } catch (error) {
            console.error("Error fetching data:", error);
            setLoadingUsers(false);
        }
    }, [currentUser, userProfile, activeChatId]);

    // Keep ref updated
    useEffect(() => {
        fetchRef.current = fetchData;
    }, [fetchData]);

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);


    // Stable WebSocket Subscriptions
    useEffect(() => {
        if (!currentUser) return;

        console.log("Setting up Chat Realtime Subscriptions...");

        const unsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.CONVERSATIONS}.documents`,
            (response) => {
                const payload = response.payload as any;
                if (payload.participants && payload.participants.includes(currentUser.$id)) {
                    fetchRef.current(); // Use ref to call latest fetch without re-subscribing
                }
            }
        );

        const userUnsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.USERS}.documents`,
            (response) => {
                if (response.events.includes('databases.*.collections.*.documents.*.update')) {
                    const payload = response.payload as any;
                    setChatUsers(prevUsers => prevUsers.map(u => {
                        if (u.id === payload.$id) {
                            return {
                                ...u,
                                isOnline: payload.isOnline,
                                status: payload.status,
                                lastSeen: payload.lastSeen
                            };
                        }
                        return u;
                    }));
                }
            }
        );

        const invitesUnsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.INVITES}.documents`,
            (response) => {
                console.log("Realtime Invite Event:", response);
                const payload = response.payload as any;
                // Log payload to verify IDs
                console.log("Invite Payload:", payload, "CurrentUser:", currentUser.$id);

                if (payload.receiverId === currentUser.$id || payload.senderId === currentUser.$id) {
                    console.log("Invite update detected, refreshing...");
                    fetchRef.current();
                } else {
                    console.log("Invite NOT relevant to me.");
                }
            }
        );

        return () => {
            console.log("Cleaning up Chat Subscriptions");
            unsubscribe();
            userUnsubscribe();
            invitesUnsubscribe();
        };
    }, [currentUser?.$id]); // Only re-subscribe if User ID changes (login/logout)

    return {
        chatUsers,
        loadingUsers,
        myTeam,
        setMyTeam,
        incomingInvites,
        setIncomingInvites,
        invitedUsers,
        setInvitedUsers,
        checkUser
    };
};
