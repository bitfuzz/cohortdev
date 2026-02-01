import React, { useRef } from 'react';
import { Search, Users, Mail, X, Plus, Check, MoreVertical } from 'lucide-react';
import { User, Invite, Team } from '../../types';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

interface ChatSidebarProps {
    showSidebar: boolean;
    setShowSidebar: (show: boolean) => void;
    activeTab: 'CHATS' | 'INVITES';
    setActiveTab: (tab: 'CHATS' | 'INVITES') => void;
    incomingInvites: Invite[];
    activeChat: string | 'TEAM';
    setActiveChat: (chat: string | 'TEAM') => void;
    myTeam: Team | null;
    currentUser: User | null;
    teamMembers: User[];
    loadingUsers: boolean;
    chatUsers: User[];
    blockedUsers: Set<string>;
    menuOpenId: string | null;
    setMenuOpenId: (id: string | null) => void;
    invitedUsers: Map<string, string>;
    handleInvite: (e: React.MouseEvent, userId: string) => void;
    handleUninvite: (e: React.MouseEvent, userId: string) => void;
    handleAcceptInvite: (invite: Invite) => void;
    handleRejectInvite: (invite: Invite) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
    showSidebar,
    setShowSidebar,
    activeTab,
    setActiveTab,
    incomingInvites,
    activeChat,
    setActiveChat,
    myTeam,
    currentUser,
    teamMembers,
    loadingUsers,
    chatUsers,
    blockedUsers,
    menuOpenId,
    setMenuOpenId,
    invitedUsers,
    handleInvite,
    handleUninvite,
    handleAcceptInvite,
    handleRejectInvite
}) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, () => setMenuOpenId(null));

    const filteredUsers = chatUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.handle && user.handle.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <>
            <div className={`fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden ${showSidebar ? 'block' : 'hidden'}`} onClick={() => setShowSidebar(false)} />

            <div className={`fixed md:relative z-50 w-80 h-full bg-surface border-r border-border shadow-hard md:shadow-none flex flex-col transition-transform duration-300 shrink-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 border-b border-border flex items-center justify-between bg-gruv-bg-hard shrink-0">
                    <h2 className="font-bold text-lg flex items-center gap-2 uppercase tracking-widest text-gruv-fg">
                        <div className="w-8 h-8 bg-primary rounded-none flex items-center justify-center text-primary-fg border border-primary-fg">
                            <Users size={18} />
                        </div>
                        Connect
                    </h2>
                    <button onClick={() => setShowSidebar(false)} className="md:hidden p-2 hover:bg-border rounded-none border border-transparent hover:border-border">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4 border-b border-border bg-gruv-bg shrink-0">
                    <div className="flex gap-2 mb-4 px-1">
                        <button
                            onClick={() => setActiveTab('CHATS')}
                            className={`flex-1 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-colors border border-border ${activeTab === 'CHATS' ? 'bg-primary text-primary-fg border-primary' : 'text-muted hover:bg-border hover:text-foreground'}`}
                        >
                            Chats
                        </button>
                        <button
                            onClick={() => setActiveTab('INVITES')}
                            className={`flex-1 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition-colors border border-border relative ${activeTab === 'INVITES' ? 'bg-primary text-primary-fg border-primary' : 'text-muted hover:bg-border hover:text-foreground'}`}
                        >
                            Invites
                            {incomingInvites.length > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                        </button>
                    </div>

                    {activeTab === 'CHATS' && (
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-3.5 text-muted" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-background border border-border rounded-none py-3 pl-10 pr-4 text-sm font-mono text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-0 transition-all"
                                placeholder="Search users or @handle..."
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                    {activeTab === 'CHATS' ? (
                        <>
                            <div
                                onClick={() => setActiveChat('TEAM')}
                                className={`px-4 py-4 rounded-none flex items-center gap-3 cursor-pointer transition-all border-b border-border hover:bg-gruv-bg-hard ${activeChat === 'TEAM' ? 'bg-primary/10 border-l-4 border-l-primary text-foreground' : 'bg-background text-muted hover:text-foreground border-l-4 border-l-transparent'}`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeChat === 'TEAM' ? 'bg-primary text-primary-fg' : 'bg-surface border border-border'}`}>
                                    <Users size={20} />
                                </div>
                                <div>
                                    <span className="text-sm font-bold block">
                                        {myTeam ? myTeam.name : 'Team Hub'}
                                    </span>
                                    <span className="text-xs text-muted">
                                        {myTeam ? `${myTeam.members.length} Members` : 'Join a team'}
                                    </span>
                                </div>
                            </div>

                            {!myTeam && (
                                <div className="px-4 py-3 border-b border-border">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleInvite(e, 'CREATE_TEAM_TRIGGER');
                                        }}
                                        className="w-full py-2 bg-surface border border-border text-foreground rounded-none font-bold hover:border-primary hover:text-primary transition-all shadow-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider hover:bg-primary/5"
                                    >
                                        <Plus size={14} /> Create Team
                                    </button>
                                </div>
                            )}

                            <div className="h-px bg-border my-0"></div>

                            <h3 className="text-[10px] font-bold text-gruv-fg-dim uppercase tracking-widest px-4 py-2 bg-gruv-bg-hard border-y border-border">Direct Messages</h3>
                            <div className="space-y-1">
                                {loadingUsers ? (
                                    <div className="text-center text-muted text-sm py-4">Loading users...</div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="text-center text-muted text-sm py-4 italic">No users found</div>
                                ) : filteredUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-none cursor-pointer transition-colors group border-b border-border relative hover:bg-gruv-bg-soft ${activeChat === user.id ? 'bg-primary/5 border-l-4 border-l-primary pl-3' : 'border-l-4 border-l-transparent pl-3'}`}
                                        onClick={() => setActiveChat(user.id)}
                                    >
                                        <div className="relative shrink-0 p-0.5">
                                            <img src={user.avatar} className="w-10 h-10 rounded-lg bg-border object-cover" alt={user.name} />
                                            {user.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-gruv-green border border-background rounded-none z-10"></div>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className={`text-sm font-bold truncate ${activeChat === user.id ? 'text-primary' : 'text-foreground'}`}>{user.name}</p>
                                                {blockedUsers.has(user.id) && <span className="text-xs text-red-500 font-bold">BLOCKED</span>}
                                            </div>
                                            <p className="text-xs text-muted truncate">{user.status || (user.isOnline ? 'Online' : 'Offline')}</p>
                                        </div>

                                        <div className="relative" ref={menuRef}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpenId(menuOpenId === user.id ? null : user.id);
                                                }}
                                                className="p-1.5 rounded-none text-muted hover:text-foreground hover:bg-border opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {menuOpenId === user.id && (
                                                <div className="absolute right-0 top-8 z-50 bg-surface border border-border rounded-none shadow-hard w-48 overflow-hidden">
                                                    {(!myTeam || myTeam.adminId === currentUser?.id) && (
                                                        <button
                                                            onClick={(e) => {
                                                                if (invitedUsers.has(user.id)) {
                                                                    handleUninvite(e, user.id);
                                                                } else {
                                                                    handleInvite(e, user.id);
                                                                }
                                                            }}
                                                            className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-fg flex items-center gap-2 ${invitedUsers.has(user.id) ? 'text-red-500' : ''}`}
                                                        >
                                                            {invitedUsers.has(user.id) ? (
                                                                <>
                                                                    <X size={16} /> Uninvite
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus size={16} /> Invite to Team
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    {myTeam && myTeam.adminId !== currentUser?.id && (
                                                        <div className="px-4 py-3 text-xs text-muted italic">
                                                            Only the team leader can invite.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            {incomingInvites.length === 0 ? (
                                <div className="text-center py-8 text-muted font-mono text-xs">
                                    <Mail size={32} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-medium">No pending invites</p>
                                </div>
                            ) : (
                                incomingInvites.map(invite => {
                                    const sender = chatUsers.find(u => u.id === invite.senderId);
                                    return (
                                        <div key={invite.$id} className="p-3 bg-background border-b border-border rounded-none">
                                            <div className="flex items-center gap-3 mb-3">
                                                <img
                                                    src={sender?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${invite.senderId}`}
                                                    className="w-10 h-10 rounded-lg bg-border object-cover"
                                                    alt={sender?.name || 'User'}
                                                />
                                                <div>
                                                    <p className="text-sm font-bold text-foreground">{sender?.name || 'Unknown User'}</p>
                                                    <p className="text-xs text-muted">wants to connect</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => handleAcceptInvite(invite)}
                                                    className="flex-1 py-1.5 bg-gruv-green text-gruv-bg rounded-none text-xs font-bold uppercase flex items-center justify-center gap-1 hover:brightness-110 border border-transparent"
                                                >
                                                    <Check size={14} /> Accept
                                                </button>
                                                <button
                                                    onClick={() => handleRejectInvite(invite)}
                                                    className="flex-1 py-1.5 bg-surface border border-border text-foreground rounded-none text-xs font-bold uppercase flex items-center justify-center gap-1 hover:bg-border"
                                                >
                                                    <X size={14} /> Decline
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
