import React, { useState, useEffect } from 'react';
import { Search, Github, Globe, MessageSquare, Circle } from 'lucide-react';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { User } from '../types';
import { databases, COLLECTIONS, DATABASE_ID, Query } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Models } from 'appwrite';

type UserDocument = Models.Document & {
    name: string;
    handle?: string;
    avatar?: string;
    role?: string;
    bio?: string;
    tags?: string[];
    stack?: string[];
    githubActivity?: number[];
    isOnline?: boolean;
    isHidden?: boolean;
    status?: string;
    github?: string;
    website?: string;
};

interface FeedProps {
    onViewProfile: (user: User) => void;
    onMessage: (user: User) => void;
}

export const Feed: React.FC<FeedProps> = ({ onViewProfile, onMessage }) => {
    const { user: currentUser, blockedUsers } = useAuth();
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, [searchTerm]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const queries = [];
            if (searchTerm) {
                queries.push(Query.orderDesc('$createdAt'));
                queries.push(Query.limit(50));
            } else {
                queries.push(Query.orderDesc('$createdAt'));
                queries.push(Query.limit(50));
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.USERS,
                queries
            );

            // Map Appwrite documents to User type
            const mappedUsers: User[] = response.documents.map((doc: Models.Document) => {
                const d = doc as UserDocument;
                return {
                    id: d.$id,
                    name: d.name,
                    handle: d.handle || '@user',
                    avatar: d.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.$id}`,
                    role: (d.role as any) || 'Developer',
                    bio: d.bio || 'Ready to hack.',
                    tags: d.tags || [],
                    stack: d.stack || [],
                    githubActivity: d.githubActivity || [],
                    isOnline: d.isOnline || false,
                    isHidden: d.isHidden || false,
                    status: d.status as any,
                    github: d.github,
                    website: d.website,
                };
            });

            // Client-side filtering for the MVP to ensure search works immediately
            let filtered = searchTerm ? mappedUsers.filter(u =>
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.handle && u.handle.toLowerCase().includes(searchTerm.toLowerCase())) ||
                u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.stack.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
            ) : mappedUsers;

            // Filter out current user and hidden users
            if (currentUser) {
                filtered = filtered.filter(u => u.id !== currentUser.$id);
            }
            filtered = filtered.filter(u => !u.isHidden);

            setUsers(filtered);
        } catch (error) {
            console.error("Failed to fetch users", error);
            // Fallback to empty or show error
        } finally {
            setLoading(false);
        }
    };

    const handleMessage = (e: React.MouseEvent, user: User) => {
        e.stopPropagation();
        if (blockedUsers.has(user.id)) {
            addToast("Unblock user to send message", "error");
            return;
        }
        onMessage(user);
    };

    return (
        <div className="min-h-screen pt-24 px-6 max-w-7xl mx-auto pb-40">

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-20 space-y-8">
                <h1 className="text-6xl font-extrabold tracking-tight text-foreground leading-none uppercase">
                    Find your <span className="text-primary underline decoration-4 decoration-primary/30 underline-offset-4">cohort.</span>
                </h1>

            </div>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto mb-20 relative group z-20">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="h-6 w-6 text-muted group-focus-within:text-primary transition-colors" />
                </div>
                <input
                    type="text"
                    className="w-full bg-surface border border-border text-foreground rounded-none py-4 pl-14 pr-6 outline-none focus:border-primary focus:ring-0 transition-all text-lg placeholder:text-muted/50 shadow-none group-hover:shadow-hard font-mono"
                    placeholder="SEARCH ROLE OR STACK..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="text-center text-muted font-mono uppercase tracking-widest">Loading potential teammates...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.length === 0 && (
                        <div className="col-span-full text-center text-muted py-20 font-mono uppercase tracking-widest">
                            No users found. Be the first to join!
                        </div>
                    )}
                    {users.map((user) => {
                        return (
                            <SpotlightCard
                                key={user.id}
                                className="h-full flex flex-col group"
                                noHover
                            >
                                <div className="p-6 flex-1 flex flex-col">

                                    {/* User Header - Clickable for Profile */}
                                    <div
                                        className="flex justify-between items-start mb-6 cursor-pointer"
                                        onClick={() => onViewProfile(user)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-16 h-16 rounded-none object-cover bg-border border border-border shadow-none group-hover:border-primary transition-colors"
                                            />
                                            <div>
                                                <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors uppercase tracking-wide">{user.name}</h3>
                                                <p className="text-sm font-bold text-muted font-mono">{user.handle}</p>
                                            </div>
                                        </div>

                                        {/* Status Indicator */}
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-none border text-[10px] font-bold uppercase tracking-wide font-mono ${user.isOnline ? 'bg-gruv-green/10 border-gruv-green/20 text-gruv-green' : 'bg-border/50 border-border text-muted'}`}>
                                            <Circle size={8} fill="currentColor" strokeWidth={0} />
                                            {user.isOnline ? 'ON' : 'OFF'}
                                        </div>
                                    </div>

                                    {/* Role & Bio */}
                                    <div className="mb-8 flex-1">
                                        <div className={`inline-block px-3 py-1 rounded-none text-xs font-bold mb-4 border text-primary border-primary/30 bg-primary/10 uppercase tracking-wider`}>
                                            {user.role}
                                        </div>
                                        <p className="text-muted font-medium leading-relaxed text-sm">
                                            {user.bio}
                                        </p>
                                    </div>

                                    {/* Skills */}
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-2">
                                            {user.stack.slice(0, 3).map(tech => (
                                                <span key={tech} className="px-2 py-1 bg-background rounded-none text-[10px] font-bold text-muted uppercase tracking-wide border border-border font-mono">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-background/30">
                                    <div className="flex gap-4">
                                        {user.github && (
                                            <a
                                                href={`https://github.com/${user.github}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted hover:text-primary transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Github size={20} />
                                            </a>
                                        )}
                                        {user.website && (
                                            <a
                                                href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted hover:text-primary transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Globe size={20} />
                                            </a>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleMessage(e, user)}
                                        className={`
                                px-4 py-2 border rounded-none text-xs font-bold transition-all flex items-center gap-2 uppercase shadow-none active:translate-y-0.5
                                bg-background border-border text-foreground hover:border-primary hover:text-primary hover:bg-primary/5
                            `}
                                    >
                                        <MessageSquare size={14} /> Message
                                    </button>
                                </div>
                            </SpotlightCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
};