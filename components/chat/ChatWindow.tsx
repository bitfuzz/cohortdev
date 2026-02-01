import React, { useState } from 'react';
import { Send, Hash, Users, Ban, AlertTriangle, Crown, Settings as SettingsIcon, X } from 'lucide-react';
import { User, Team } from '../../types';
import { Message } from '../../hooks/useChatMessages';

interface ChatWindowProps {
    activeChat: string | 'TEAM';
    currentUser: User | null;
    myTeam: Team | null;
    chatUsers: User[];
    teamMembers: User[];
    messages: Message[];
    blockedUsers: Set<string>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    sendMessage: (text: string, blockedUsers: Set<string>) => Promise<void>;
    toggleBlock: () => void;
    setShowSidebar: (show: boolean) => void;
    setIsTeamSettingsOpen: (open: boolean) => void;
    setActiveTab: (tab: 'CHATS' | 'INVITES') => void;
    onClose?: () => void;
    loading?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
    activeChat,
    currentUser,
    myTeam,
    chatUsers,
    teamMembers,
    messages,
    blockedUsers,
    messagesEndRef,
    sendMessage,
    toggleBlock,
    setShowSidebar,
    setIsTeamSettingsOpen,
    setActiveTab,
    onClose,
    loading
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleSend = async () => {
        try {
            await sendMessage(inputValue, blockedUsers);
            setInputValue('');
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const activeUser = activeChat === 'TEAM' ? null : chatUsers.find(u => u.id === activeChat);
    const isBlocked = typeof activeChat === 'string' && activeChat !== 'TEAM' && blockedUsers.has(activeChat);
    const myTeamId = currentUser?.teamId;

    const displayName = activeChat === 'TEAM'
        ? (myTeam ? myTeam.name : 'Team Hub')
        : (activeUser ? activeUser.name : (loading ? 'Loading...' : 'Deleted User'));

    const displayRole = activeChat === 'TEAM'
        ? (myTeam ? `${teamMembers.length + 1} Members` : 'No Team')
        : (activeUser ? activeUser.role : (loading ? '...' : 'Account Deleted'));

    return (
        <div className="flex-1 flex flex-col bg-surface border border-border shadow-none overflow-hidden relative w-full min-w-0">
            <div className="h-20 border-b border-border flex items-center justify-between px-4 md:px-8 bg-gruv-bg-hard z-10 shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        onClick={() => setShowSidebar(true)}
                        className="md:hidden p-2 -ml-2 hover:bg-border rounded-none text-muted border border-transparent hover:border-border"
                    >
                        <Users size={24} />
                    </button>

                    {activeChat === 'TEAM' ? (
                        <div className="w-10 h-10 rounded-none bg-primary/10 flex items-center justify-center text-primary border border-primary shrink-0">
                            <Hash size={20} strokeWidth={2.5} />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-none bg-border flex items-center justify-center shrink-0 border border-border overflow-hidden">
                            {activeUser ? (
                                <img src={activeUser.avatar} className="w-full h-full object-cover" />
                            ) : (
                                <Users size={20} className="text-muted" />
                            )}
                        </div>
                    )}

                    <div
                        className={activeChat === 'TEAM' ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                        onClick={() => activeChat === 'TEAM' && myTeam && setIsTeamSettingsOpen(true)}
                    >
                        <span className="text-lg font-bold text-gruv-fg block flex items-center gap-2 uppercase tracking-wide truncate">
                            {displayName}
                            {isBlocked && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">BLOCKED</span>}
                        </span>
                        <span className="text-xs font-bold text-gruv-fg-dim uppercase tracking-widest font-mono truncate">
                            {displayRole}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-muted shrink-0">
                    {activeChat === 'TEAM' && myTeam && (
                        <button
                            onClick={() => setIsTeamSettingsOpen(true)}
                            className="p-2 text-muted hover:bg-border hover:text-foreground rounded-none transition-colors border border-transparent hover:border-border"
                            title="Team Settings"
                        >
                            <SettingsIcon size={20} />
                        </button>
                    )}
                    {activeChat !== 'TEAM' && (
                        <div
                            onClick={toggleBlock}
                            className={`p-2 rounded-none cursor-pointer transition-colors border border-transparent ${isBlocked ? 'bg-gruv-red text-gruv-bg hover:bg-gruv-red/90 border-gruv-red' : 'hover:bg-border hover:text-gruv-red hover:border-border'}`}
                            title={isBlocked ? "Unblock User" : "Block User"}
                        >
                            <Ban size={20} />
                        </div>
                    )}
                    {/* Buttons removed as per cleanup request */}
                    <button
                        onClick={onClose}
                        className="p-2 ml-2 text-muted hover:bg-border hover:text-foreground rounded-none transition-colors border border-transparent hover:border-border"
                        title="Close Chat"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/30 scrollbar-thin flex flex-col">
                {activeChat === 'TEAM' && !myTeamId ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-20 h-20 bg-surface border border-border rounded-none flex items-center justify-center mb-6">
                            <Users size={32} className="text-muted" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Join a Team</h2>
                        <p className="text-muted max-w-md mb-8">
                            You haven't joined a team yet. Invite others to connect, and once they accept, you'll be added to a team automatically!
                        </p>
                        <button
                            onClick={() => setActiveTab('INVITES')}
                            className="px-6 py-3 bg-primary text-primary-fg rounded-none font-bold uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform border border-transparent"
                        >
                            Check Invites
                        </button>
                    </div>
                ) : messages.length === 0 && !isBlocked ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted opacity-50 font-mono text-xs uppercase tracking-widest">
                        <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center mb-4">
                            <Send size={24} />
                        </div>
                        <p className="font-medium text-sm">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    <div className="mt-auto flex flex-col">
                        {activeChat === 'TEAM' && myTeamId && (
                            null
                        )}

                        {messages.map((msg, index) => {
                            // Debugging ID mismatch
                            if (msg.senderId !== currentUser?.id) {

                            }
                            const isMe = msg.senderId === currentUser?.id;
                            const user = isMe ? { name: 'Me', avatar: currentUser?.avatar } : chatUsers.find(u => u.id === msg.senderId);
                            const isDeleted = !isMe && !user;

                            // Grouping Logic
                            const prevMsg = messages[index - 1];
                            const isSequence = prevMsg &&
                                prevMsg.senderId === msg.senderId &&
                                (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000);

                            return (
                                <div key={msg.$id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} ${isSequence ? 'mt-1' : 'mt-6'}`}>
                                    {!isMe && (
                                        <div className="w-8 flex flex-col items-center shrink-0">
                                            {!isSequence && (
                                                <div className="w-8 h-8 rounded-lg bg-border overflow-hidden border border-border">
                                                    {isDeleted ? (
                                                        <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                                                            <Users size={14} className="text-muted" />
                                                        </div>
                                                    ) : (
                                                        <img src={user?.avatar} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] md:max-w-[70%] flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                                        {!isSequence && (
                                            <div className="flex items-center gap-2 mb-1">
                                                {!isMe && <span className="text-xs font-bold text-foreground">{isDeleted ? 'Deleted User' : user?.name}</span>}
                                                <span className="text-[10px] font-bold text-muted uppercase tracking-wide">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        )}
                                        <div
                                            className={`px-4 py-3 rounded-none text-sm font-medium leading-relaxed shadow-none break-words border 
                                                ${isMe ? 'bg-primary text-primary-fg border-primary' : 'bg-surface text-foreground border-border'}
                                                ${isMe && isSequence ? 'rounded-tr-sm' : ''}
                                                ${!isMe && isSequence ? 'rounded-tl-sm' : ''}
                                            `}
                                            title={new Date(msg.timestamp).toLocaleTimeString()}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {isBlocked ? (
                <div className="p-6 bg-gruv-red/10 border-t border-gruv-red flex items-center justify-center gap-2 text-gruv-red font-bold uppercase tracking-wide">
                    <AlertTriangle size={20} />
                    <span className="font-bold">You have blocked this user. Unblock to send messages.</span>
                </div>
            ) : activeChat !== 'TEAM' && !activeUser ? (
                loading ? (
                    <div className="p-6 bg-surface border-t border-border flex items-center justify-center gap-2 text-muted font-bold uppercase tracking-wide">
                        <span className="font-bold animate-pulse">Loading user data...</span>
                    </div>
                ) : (
                    <div className="p-6 bg-surface border-t border-border flex items-center justify-center gap-2 text-muted font-bold uppercase tracking-wide">
                        <Ban size={20} />
                        <span className="font-bold">This user has deleted their account.</span>
                    </div>
                )
            ) : (
                <div className="p-4 md:p-6 bg-surface border-t border-border shrink-0">
                    <div className="relative flex items-center gap-3">
                        {/* Mic removed */}
                        <input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="flex-1 bg-background border border-border rounded-none px-4 py-3 font-mono text-sm text-foreground focus:border-primary focus:outline-none transition-colors placeholder:text-muted"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className="p-3 bg-primary text-primary-fg rounded-none hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-hard active:translate-y-0.5 active:shadow-none border border-transparent"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
