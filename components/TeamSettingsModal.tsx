import React, { useState } from 'react';
import { X, Users, LogOut, Trash2, Shield, Crown } from 'lucide-react';
import { Team, User } from '../types';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface TeamSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team;
    currentUser: User;
    members: User[];
    onLeaveTeam: () => void;
    onDisbandTeam: () => void;
    onTransferOwnership: (memberId: string) => void;
}

export const TeamSettingsModal: React.FC<TeamSettingsModalProps> = ({
    isOpen,
    onClose,
    team,
    currentUser,
    members,
    onLeaveTeam,
    onDisbandTeam,
    onTransferOwnership
}) => {
    const [confirmAction, setConfirmAction] = useState<{
        type: 'LEAVE' | 'DISBAND' | 'TRANSFER';
        data?: any;
    } | null>(null);

    if (!isOpen) return null;

    const isAdmin = team.adminId === currentUser.id;

    const handleConfirm = () => {
        if (!confirmAction) return;

        switch (confirmAction.type) {
            case 'LEAVE':
                onLeaveTeam();
                break;
            case 'DISBAND':
                onDisbandTeam();
                break;
            case 'TRANSFER':
                if (confirmAction.data) {
                    onTransferOwnership(confirmAction.data);
                }
                break;
        }
        setConfirmAction(null);
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-surface border-2 border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 border-2 border-primary/20">
                            <Users size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">{team.name}</h2>
                        <p className="text-muted font-medium mt-1">
                            {members.length} {members.length === 1 ? 'Member' : 'Members'}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                                Team Members
                            </h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                                {members.map(member => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={member.avatar}
                                                alt={member.name}
                                                className="w-10 h-10 rounded-lg object-cover bg-border"
                                            />
                                            <div>
                                                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                                    {member.name}
                                                    {member.id === team.adminId && (
                                                        <Crown size={14} className="text-yellow-500 fill-yellow-500" />
                                                    )}
                                                    {member.id === currentUser.id && (
                                                        <span className="text-xs font-medium text-muted bg-border px-1.5 py-0.5 rounded-md">You</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted">{member.role}</p>
                                            </div>
                                        </div>
                                        {/* Admin Actions */}
                                        {isAdmin && member.id !== currentUser.id && (
                                            <button
                                                onClick={() => setConfirmAction({ type: 'TRANSFER', data: member.id })}
                                                className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Promote to Leader"
                                            >
                                                <Crown size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border space-y-3">
                            {isAdmin ? (
                                <button
                                    onClick={() => setConfirmAction({ type: 'DISBAND' })}
                                    className="w-full py-3 bg-red-500/10 text-red-600 border-2 border-red-500/20 rounded-xl font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Disband Team
                                </button>
                            ) : (
                                <button
                                    onClick={() => setConfirmAction({ type: 'LEAVE' })}
                                    className="w-full py-3 bg-surface border-2 border-border text-foreground rounded-xl font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <LogOut size={18} />
                                    Leave Team
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleConfirm}
                title={
                    confirmAction?.type === 'DISBAND' ? 'Disband Team?' :
                        confirmAction?.type === 'LEAVE' ? 'Leave Team?' :
                            'Transfer Ownership?'
                }
                message={
                    confirmAction?.type === 'DISBAND' ? 'Are you sure you want to disband this team? This action cannot be undone.' :
                        confirmAction?.type === 'LEAVE' ? 'Are you sure you want to leave this team?' :
                            `Make this member the new team leader? You will become a regular member.`
                }
                confirmText={
                    confirmAction?.type === 'DISBAND' ? 'Disband' :
                        confirmAction?.type === 'LEAVE' ? 'Leave' :
                            'Transfer'
                }
                variant={confirmAction?.type === 'TRANSFER' ? 'warning' : 'danger'}
            />
        </>
    );
};
