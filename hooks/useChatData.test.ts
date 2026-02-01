import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useChatData } from './useChatData';
import { useAuth } from '../context/AuthContext';
import { databases, client, Query } from '../lib/appwrite';

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../lib/appwrite', () => ({
    databases: {
        listDocuments: vi.fn(),
        getDocument: vi.fn(),
    },
    client: {
        subscribe: vi.fn(),
    },
    Query: {
        equal: vi.fn(),
        orderDesc: vi.fn(),
    },
    COLLECTIONS: {
        CONVERSATIONS: 'conversations',
        USERS: 'users',
        TEAMS: 'teams',
        INVITES: 'invites',
    },
    DATABASE_ID: 'test-db',
}));

describe('useChatData', () => {
    const mockUser = { $id: 'user1', name: 'Test User' };
    const mockUserProfile = { id: 'user1', teamId: 'team1' };

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for useAuth
        (useAuth as any).mockReturnValue({
            user: mockUser,
            userProfile: mockUserProfile,
            checkUser: vi.fn(),
        });

        // Default mock for client.subscribe
        (client.subscribe as any).mockReturnValue(() => { });
    });

    it('should initialize with loading state', async () => {
        (databases.listDocuments as any).mockResolvedValue({ documents: [] });

        const { result } = renderHook(() => useChatData());

        expect(result.current.loadingUsers).toBe(true);

        await waitFor(() => {
            expect(result.current.loadingUsers).toBe(false);
        });
    });

    it('should fetch chat users correctly', async () => {
        // Mock data
        const mockConversations = {
            documents: [
                { participants: ['user1', 'user2'], lastMessageAt: '2023-01-01' }
            ]
        };
        const mockUsers = {
            documents: [
                { $id: 'user2', name: 'User 2', avatar: 'avatar2', isOnline: true }
            ]
        };
        const mockInvites = { documents: [] };

        (databases.listDocuments as any)
            .mockResolvedValueOnce(mockConversations) // conversations
            .mockResolvedValueOnce(mockUsers) // users
            .mockResolvedValueOnce(mockInvites) // incoming invites
            .mockResolvedValueOnce(mockInvites); // sent invites

        // execute
        const { result } = renderHook(() => useChatData());

        await waitFor(() => {
            expect(result.current.loadingUsers).toBe(false);
        });

        expect(result.current.chatUsers).toHaveLength(1);
        expect(result.current.chatUsers[0].id).toBe('user2');
        expect(databases.listDocuments).toHaveBeenCalledTimes(4);
    });

    it('should fetch team data if user has teamId', async () => {
        const mockTeam = {
            $id: 'team1',
            name: 'My Team',
            members: [],
            ownerId: 'user1',
            createdAt: '2023-01-01'
        };

        (databases.listDocuments as any).mockResolvedValue({ documents: [] });
        (databases.getDocument as any).mockResolvedValue(mockTeam);

        const { result } = renderHook(() => useChatData());

        await waitFor(() => {
            expect(result.current.myTeam).not.toBeNull();
        });

        expect(result.current.myTeam?.name).toBe('My Team');
    });
});
