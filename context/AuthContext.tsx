import React, { createContext, useContext, useEffect, useState } from 'react';
import { account, getURL, databases, functions, DATABASE_ID, COLLECTIONS, client } from '../lib/appwrite';
import { useToast } from '../components/ui/Toast';
import { Models, OAuthProvider } from 'appwrite';
import { User } from '../types';

interface AuthContextType {
    user: Models.User<Models.Preferences> | null;
    userProfile: User | null;
    loading: boolean;
    isOnboarded: boolean;
    loginWithGoogle: () => void;
    logout: () => Promise<void>;
    checkUser: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    blockedUsers: Set<string>;
    blockUser: (userId: string) => Promise<void>;
    unblockUser: (userId: string) => Promise<void>;
    unreadCount: number;
    setUnreadCount: (count: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
    const { addToast } = useToast();

    useEffect(() => {
        checkUser();
    }, []);

    useEffect(() => {
        // Check for OAuth failure params in URL
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        const failure = params.get('failure');

        if (error || failure) {
            console.error('OAuth Error Redirect:', { error, failure });
            addToast(`Login failed: ${error || 'Unknown error'}`, 'error');
        }
    }, [addToast]);

    const checkUser = async () => {
        try {
            const session = await account.get();
            setUser(session);

            // Load blocked users from prefs
            if (session.prefs && session.prefs.blocked) {
                setBlockedUsers(new Set(session.prefs.blocked));
            }

            // Check if user exists in database
            try {
                const doc = await databases.getDocument(
                    DATABASE_ID,
                    COLLECTIONS.USERS,
                    session.$id
                );

                // Map to User type
                const mappedUser: User = {
                    id: doc.$id,
                    name: doc.name,
                    handle: doc.handle || '@user',
                    avatar: doc.avatar || '',
                    role: doc.role || 'Developer',
                    bio: doc.bio || '',
                    tags: doc.tags || [],
                    stack: doc.stack || [],
                    githubActivity: doc.githubActivity || [],
                    github: doc.github,
                    website: doc.website,
                    isOnline: doc.isOnline,
                    isHidden: doc.isHidden,
                    status: doc.status,
                    teamId: doc.teamId,
                };

                // Update isOnline if false
                if (!doc.isOnline) {
                    await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, session.$id, { isOnline: true });
                    mappedUser.isOnline = true;
                }

                setUserProfile(mappedUser);
                setIsOnboarded(true);
            } catch (error) {
                console.warn("User authenticated but profile not found (DB)", error);
                setUserProfile(null);
                setIsOnboarded(false);
            }
        } catch (error: any) {
            // Explicitly handle 401 (No Session) vs other errors
            if (error.code === 401) {
                console.log("No active session detected (401)");
            } else {
                console.error("checkUser failed with unexpected error:", error);
                addToast(`Session check failed: ${error.message}`, 'error');
            }

            setUser(null);
            setIsOnboarded(false);
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        try {
            // Force clear stub session to prevent 409 merge errors
            await account.deleteSession('current');
        } catch (e) {
            // Ignore if no session exists
        }

        // Redirect to Google OAuth
        account.createOAuth2Session(
            OAuthProvider.Google,
            getURL(), // Success URL (back to home)
            getURL()  // Failure URL
        );
    };



    const logout = async () => {
        try {
            if (user) {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, user.$id, { isOnline: false });
            }
            await account.deleteSession('current');
            addToast("Logged out successfully", 'success');
        } catch (e: any) {
            // If session is already invalid (e.g. user deleted), just ignore

        }
        setUser(null);
        setUserProfile(null);
        setBlockedUsers(new Set());
        setIsOnboarded(false);
    };

    const blockUser = async (userId: string) => {
        if (!user) return;
        const newBlocked = new Set(blockedUsers);
        newBlocked.add(userId);
        setBlockedUsers(newBlocked);
        try {
            await account.updatePrefs({ ...user.prefs, blocked: Array.from(newBlocked) });
            addToast("User blocked", "info");
        } catch (e) {
            console.error("Failed to update blocked prefs", e);
            addToast("Failed to block user", "error");
        }
    };

    const unblockUser = async (userId: string) => {
        if (!user) return;
        const newBlocked = new Set(blockedUsers);
        newBlocked.delete(userId);
        setBlockedUsers(newBlocked);
        try {
            await account.updatePrefs({ ...user.prefs, blocked: Array.from(newBlocked) });
            addToast("User unblocked", "success");
        } catch (e) {
            console.error("Failed to update blocked prefs", e);
            addToast("Failed to unblock user", "error");
        }
    };

    const deleteAccount = async () => {
        if (!user) return;

        try {
            const execution = await functions.createExecution(
                'delete-user-account' // Function ID
            );

            let response = { success: false, message: "Unknown error" };
            if (execution.responseBody) {
                try {
                    response = JSON.parse(execution.responseBody);
                } catch (e) {
                    console.error("Failed to parse function response", execution.responseBody);
                }
            }

            if (execution.responseStatusCode !== 200 || !response.success) {
                console.error("Function execution failed:", {
                    statusCode: execution.responseStatusCode,
                    responseBody: execution.responseBody,
                    parsedResponse: response
                });
                // If status is 200 but success is false, or status is not 200
                throw new Error(response.message || `Function failed with status ${execution.responseStatusCode}`);
            }

            addToast("Account deleted successfully", 'success');

        } catch (error: any) {
            console.error("Error deleting account via function", error);
            addToast(`Failed to delete account: ${error.message}`, 'error');
            throw new Error("Failed to delete account. Please try again.");
        }

        await logout();
    };

    const [unreadCount, setUnreadCount] = useState(0);

    // Heartbeat: Update lastSeen every 2 minutes
    useEffect(() => {
        if (!user || !userProfile) return;

        const updateHeartbeat = async () => {
            if (document.visibilityState === 'visible') {
                try {
                    await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, user.$id, {
                        lastSeen: new Date().toISOString(),
                        isOnline: true
                    });
                } catch (e) {
                    // Silent fail
                }
            }
        };

        // Initial update
        updateHeartbeat();

        const interval = setInterval(updateHeartbeat, 120000); // 2 minutes

        return () => clearInterval(interval);
    }, [user, userProfile]);

    // Global Realtime Listener for Notifications
    useEffect(() => {
        if (!user) return;

        const unsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
            (response) => {
                if (response.events.includes('databases.*.collections.*.documents.*.create')) {
                    const payload = response.payload as any;

                    // If I am not the sender
                    if (payload.senderId !== user.$id) {
                        // Check if we are currently viewing the chat page
                        // Note: This is a simple check. Ideally we'd check if the specific chat is active.
                        const isChatPage = window.location.pathname.includes('/chat');

                        // If not on chat page, or (future improvement) not on THIS specific chat
                        if (!isChatPage) {
                            addToast(`New message received`, 'info');
                            setUnreadCount(prev => prev + 1);
                        }
                    }
                }
            }
        );

        return () => {
            unsubscribe();
        };
    }, [user, addToast]);

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            isOnboarded,
            loginWithGoogle,
            logout,
            checkUser,
            deleteAccount,
            blockedUsers,
            blockUser,
            unblockUser,
            unreadCount,
            setUnreadCount
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
