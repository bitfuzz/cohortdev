import { databases, COLLECTIONS, DATABASE_ID, ID } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import { Invite, Team } from '../types';

export const useChatActions = (
    invitedUsers: Map<string, string>,
    setInvitedUsers: React.Dispatch<React.SetStateAction<Map<string, string>>>,
    setIncomingInvites: React.Dispatch<React.SetStateAction<Invite[]>>,
    setMyTeam: React.Dispatch<React.SetStateAction<Team | null>>,
    setActiveChat: React.Dispatch<React.SetStateAction<string | 'TEAM'>>,
    setActiveTab: React.Dispatch<React.SetStateAction<'CHATS' | 'INVITES'>>,
    addToast: (message: string, type: 'success' | 'error' | 'info') => void
) => {
    const { user: currentUser, userProfile, checkUser } = useAuth();

    const handleInvite = async (userId: string) => {
        if (!currentUser) return;

        if (invitedUsers.has(userId)) return;

        try {
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.INVITES,
                ID.unique(),
                {
                    senderId: currentUser.$id,
                    receiverId: userId,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                }
            );

            const newInvited = new Map(invitedUsers);
            newInvited.set(userId, response.$id);
            setInvitedUsers(newInvited);
            addToast("Invite sent!", "success");
        } catch (error) {
            console.error("Failed to send invite", error);
            addToast("Failed to send invite", "error");
            throw error;
        }
    };

    const handleUninvite = async (userId: string) => {
        const inviteId = invitedUsers.get(userId);
        if (!inviteId) return;

        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVITES, inviteId);
            const newInvited = new Map(invitedUsers);
            newInvited.delete(userId);
            setInvitedUsers(newInvited);
            addToast("Invite cancelled", "info");
        } catch (error) {
            console.error("Failed to uninvite", error);
            addToast("Failed to cancel invite", "error");
        }
    };

    const handleAcceptInvite = async (invite: Invite) => {
        if (!currentUser) return;

        if (currentUser.teamId) {
            addToast("You are already in a team. Leave it first.", "error");
            return;
        }

        try {
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVITES, invite.$id, { status: 'accepted' });

            const senderDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.USERS, invite.senderId);
            const targetTeamId = senderDoc.teamId;

            if (targetTeamId) {
                const teamDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.TEAMS, targetTeamId);
                const newMembers = [...teamDoc.members, currentUser.$id];

                await databases.updateDocument(DATABASE_ID, COLLECTIONS.TEAMS, targetTeamId, { members: newMembers });
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, currentUser.$id, { teamId: targetTeamId });

                addToast(`Joined ${teamDoc.name}!`, "success");
            } else {
                addToast("Team no longer exists", "error");
            }

            await checkUser();
            setIncomingInvites(prev => prev.filter(i => i.$id !== invite.$id));
            setActiveChat('TEAM');
            setActiveTab('CHATS');
        } catch (error) {
            console.error("Failed to accept invite", error);
            addToast("Failed to accept invite", "error");
        }
    };

    const handleRejectInvite = async (invite: Invite) => {
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVITES, invite.$id, { status: 'rejected' });
            setIncomingInvites(prev => prev.filter(i => i.$id !== invite.$id));
            addToast("Invite declined", "info");
        } catch (error) {
            console.error("Failed to reject invite", error);
        }
    };

    const handleLeaveTeam = async (myTeam: Team) => {
        if (!currentUser || !myTeam) return;
        try {
            const newMembers = myTeam.members.filter(id => id !== currentUser.$id);
            if (newMembers.length === 0) {
                await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TEAMS, myTeam.$id);
            } else {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.TEAMS, myTeam.$id, { members: newMembers });
            }
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, currentUser.$id, { teamId: null });
            await checkUser();
            setMyTeam(null);
            setActiveChat('TEAM');
            addToast("You left the team", "info");
        } catch (error) {
            console.error("Failed to leave team", error);
            addToast("Failed to leave team", "error");
        }
    };

    const handleDisbandTeam = async (myTeam: Team) => {
        if (!currentUser || !myTeam) return;
        try {
            const memberPromises = myTeam.members.map(memberId =>
                databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, memberId, { teamId: null })
            );
            await Promise.all(memberPromises);
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TEAMS, myTeam.$id);
            await checkUser();
            setMyTeam(null);
            setActiveChat('TEAM');
            addToast("Team disbanded", "success");
        } catch (error) {
            console.error("Failed to disband team", error);
            addToast("Failed to disband team", "error");
        }
    };

    const handleTransferOwnership = async (myTeam: Team, newOwnerId: string) => {
        if (!currentUser || !myTeam) return;
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.TEAMS, myTeam.$id, {
                ownerId: newOwnerId,
                adminId: newOwnerId
            });
            await checkUser();
            // We don't nullify myTeam here, just refresh
            const updatedTeam = await databases.getDocument<Team>(DATABASE_ID, COLLECTIONS.TEAMS, myTeam.$id);
            setMyTeam(updatedTeam);
            addToast("Team leadership transferred", "success");
        } catch (error) {
            console.error("Failed to transfer ownership", error);
            addToast("Failed to transfer leadership", "error");
        }
    };

    return {
        handleInvite,
        handleUninvite,
        handleAcceptInvite,
        handleRejectInvite,
        handleLeaveTeam,
        handleDisbandTeam,
        handleTransferOwnership
    };
};
