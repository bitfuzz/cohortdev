import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { databases, COLLECTIONS, DATABASE_ID, ID, Permission, Role } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';

interface CreateTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTeamCreated: (teamId: string, teamName: string) => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, onTeamCreated }) => {
    const { user, checkUser } = useAuth();
    const { addToast } = useToast();
    const [teamName, setTeamName] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamName.trim() || !user) return;

        setLoading(true);
        try {
            // 1. Create Team Document
            const teamId = ID.unique();
            await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.TEAMS,
                teamId,
                {
                    name: teamName,
                    ownerId: user.$id,
                    adminId: user.$id,
                    members: [user.$id],
                    createdAt: new Date().toISOString()
                },
                [
                    Permission.read(Role.any()), // Publicly visible? Or just members? Let's say public for now so people can search.
                    Permission.update(Role.user(user.$id)),
                    Permission.delete(Role.user(user.$id)),
                    // Also allow members to read?
                ]
            );

            // 2. Update User's teamId
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.USERS,
                user.$id,
                { teamId: teamId }
            );

            // 3. Refresh User Context
            await checkUser();

            onTeamCreated(teamId, teamName);
            onClose();
            addToast(`Team "${teamName}" created successfully!`, 'success');
        } catch (error: any) {
            console.error("Failed to create team", error);
            addToast(`Failed to create team: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border-2 border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                        <Users size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Create a Team</h2>
                    <p className="text-muted text-sm mt-1">
                        You need a team to invite others. Give your squad a name!
                    </p>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-2">
                            Team Name
                        </label>
                        <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="e.g. The Hackers, Code Wizards..."
                            className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 font-bold text-foreground focus:border-primary focus:outline-none transition-colors placeholder:font-medium placeholder:text-muted/50"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !teamName.trim()}
                        className="w-full bg-primary text-primary-fg font-bold py-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-soft active:scale-95"
                    >
                        {loading ? 'Creating...' : 'Create Team'}
                    </button>
                </form>
            </div>
        </div>
    );
};
