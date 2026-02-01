import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { TeamSettingsModal } from '../components/TeamSettingsModal';
import { useToast } from '../components/ui/Toast';
import { useChatData } from '../hooks/useChatData';
import { useChatMessages } from '../hooks/useChatMessages';
import { useChatActions } from '../hooks/useChatActions';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';

interface ChatProps {
    initialChatId?: string;
}

export const Chat: React.FC<ChatProps> = ({ initialChatId }) => {
    const { user, userProfile, blockedUsers, blockUser, unblockUser } = useAuth();
    const { addToast } = useToast();

    // Use userProfile if available, otherwise create a safe fallback from the Auth user
    // We avoid spreading ...user because it contains Appwrite-specific objects (like prefs) that can cause React rendering errors
    const currentUser = userProfile || (user ? {
        id: user.$id,
        name: user.name,
        handle: 'user',
        avatar: '', // Fallback avatar
        role: 'Developer',
        bio: '',
        tags: [],
        stack: [],
        githubActivity: [],
        isOnline: true,
        isHidden: false
    } as any : null);
    const [activeChat, setActiveChat] = useState<string | 'TEAM'>(initialChatId || 'TEAM');
    // blockedUsers is now in AuthContext
    const [showSidebar, setShowSidebar] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
    const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
    const [pendingInviteUserId, setPendingInviteUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'CHATS' | 'INVITES'>('CHATS');

    // Custom Hooks
    const {
        chatUsers,
        loadingUsers,
        myTeam,
        setMyTeam,
        incomingInvites,
        setIncomingInvites,
        invitedUsers,
        setInvitedUsers,
        checkUser
    } = useChatData(activeChat);

    const { messages, sendMessage, messagesEndRef } = useChatMessages(activeChat, myTeam);

    const {
        handleInvite: inviteAction,
        handleUninvite,
        handleAcceptInvite,
        handleRejectInvite,
        handleLeaveTeam: leaveTeamAction,
        handleDisbandTeam: disbandTeamAction,
        handleTransferOwnership: transferOwnershipAction
    } = useChatActions(
        invitedUsers,
        setInvitedUsers,
        setIncomingInvites,
        setMyTeam,
        setActiveChat,
        setActiveTab,
        addToast
    );

    // Derived State
    const teamMembers = activeChat === 'TEAM' && myTeam
        ? chatUsers.filter(u => myTeam.members.includes(u.id))
        : [];

    const allTeamMembers = activeChat === 'TEAM' && myTeam
        ? [currentUser!, ...teamMembers].filter(Boolean)
        : [];

    // Handlers
    const toggleBlock = async () => {
        if (activeChat === 'TEAM') return;

        if (blockedUsers.has(activeChat)) {
            await unblockUser(activeChat);
        } else {
            await blockUser(activeChat);
        }
    };

    const handleInviteWrapper = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        setMenuOpenId(null);
        console.log("handleInviteWrapper called for:", userId, "myTeam:", myTeam);

        if (!myTeam) {
            console.log("No team, opening create modal");
            setPendingInviteUserId(userId);
            setIsCreateTeamModalOpen(true);
        } else {
            console.log("Has team, sending invite");
            inviteAction(userId);
        }
    };

    const handleUninviteWrapper = (e: React.MouseEvent, userId: string) => {
        e.stopPropagation();
        setMenuOpenId(null);
        handleUninvite(userId);
    };

    const handleTeamCreated = async (teamId: string, teamName: string) => {
        if (pendingInviteUserId) {
            try {
                await inviteAction(pendingInviteUserId);
                setPendingInviteUserId(null);
            } catch (error) {
                console.error("Failed to send pending invite", error);
            }
        }
        await checkUser();
    };

    return (
        <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center p-4 md:p-6 overflow-hidden">
            <div className="flex h-full w-full max-w-6xl gap-0 md:gap-6 relative bg-transparent">
                <ChatSidebar
                    showSidebar={showSidebar}
                    setShowSidebar={setShowSidebar}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    incomingInvites={incomingInvites}
                    activeChat={activeChat}
                    setActiveChat={setActiveChat}
                    myTeam={myTeam}
                    teamMembers={teamMembers}
                    loadingUsers={loadingUsers}
                    chatUsers={chatUsers}
                    blockedUsers={blockedUsers}
                    menuOpenId={menuOpenId}
                    setMenuOpenId={setMenuOpenId}
                    invitedUsers={invitedUsers}
                    handleInvite={(e, userId) => {
                        if (userId === 'CREATE_TEAM_TRIGGER') {
                            setIsCreateTeamModalOpen(true);
                        } else {
                            handleInviteWrapper(e, userId);
                        }
                    }}
                    handleUninvite={handleUninviteWrapper}
                    handleAcceptInvite={handleAcceptInvite}
                    handleRejectInvite={handleRejectInvite}
                    currentUser={currentUser}
                />

                <ChatWindow
                    activeChat={activeChat}
                    currentUser={currentUser}
                    myTeam={myTeam}
                    chatUsers={chatUsers}
                    teamMembers={teamMembers}
                    messages={messages}
                    blockedUsers={blockedUsers}
                    messagesEndRef={messagesEndRef}
                    sendMessage={sendMessage}
                    toggleBlock={toggleBlock}
                    setShowSidebar={setShowSidebar}
                    setIsTeamSettingsOpen={setIsTeamSettingsOpen}
                    setActiveTab={setActiveTab}
                    onClose={() => setActiveChat('TEAM')}
                    loading={loadingUsers}
                />

                <CreateTeamModal
                    isOpen={isCreateTeamModalOpen}
                    onClose={() => setIsCreateTeamModalOpen(false)}
                    onTeamCreated={handleTeamCreated}
                />

                {myTeam && currentUser && (
                    <TeamSettingsModal
                        isOpen={isTeamSettingsOpen}
                        onClose={() => setIsTeamSettingsOpen(false)}
                        team={myTeam}
                        currentUser={currentUser}
                        members={allTeamMembers}
                        onLeaveTeam={() => leaveTeamAction(myTeam)}
                        onDisbandTeam={() => disbandTeamAction(myTeam)}
                        onTransferOwnership={(memberId) => transferOwnershipAction(myTeam, memberId)}
                    />
                )}
            </div>
        </div>
    );
};