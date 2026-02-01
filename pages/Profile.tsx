import React, { useState, useEffect, useRef } from 'react';
import { Camera, Edit2, Save, Github, Globe, MessageSquare, X, Plus, LogOut } from 'lucide-react';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { AvatarCropModal } from '../components/ui/AvatarCropModal';
import { useToast } from '../components/ui/Toast';
import { User } from '../types';
import { databases, DATABASE_ID, COLLECTIONS, storage, BUCKET_ID, ID, getStorageFileUrl } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';

interface ProfileProps {
    user: User;
    isOwnProfile?: boolean;
    onMessage?: (user: User) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user: initialUser, isOwnProfile = true, onMessage }) => {
    const { logout } = useAuth();
    const { addToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [user, setUser] = useState<User>(initialUser);
    const [saving, setSaving] = useState(false);
    const [newStackItem, setNewStackItem] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Avatar crop modal state
    const [showCropModal, setShowCropModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Update local state if the prop changes (e.g. switching between users)
    useEffect(() => {
        setUser(initialUser);
        setIsEditing(false); // Reset edit mode when switching users
    }, [initialUser]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.USERS,
                user.id,
                {
                    name: user.name,
                    bio: user.bio,
                    stack: user.stack,
                    github: user.github,
                    website: user.website,
                }
            );
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save profile", error);
            addToast("Failed to save profile. Please try again.", 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        // Read file as data URL for preview
        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImage(reader.result as string);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarCropConfirm = async (croppedBlob: Blob) => {
        try {
            // Convert blob to File
            const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });

            const response = await storage.createFile(
                BUCKET_ID,
                ID.unique(),
                file
            );

            const url = getStorageFileUrl(response.$id);

            // Update user document in database first
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.USERS,
                user.id,
                {
                    avatar: url
                }
            );

            // Update local state after successful save
            setUser({ ...user, avatar: url });
            setShowCropModal(false);
            setSelectedImage(null);
        } catch (error) {
            console.error("Failed to upload avatar", error);
            addToast("Failed to upload avatar. Please try again.", 'error');
        }
    };

    const handleAvatarCropCancel = () => {
        setShowCropModal(false);
        setSelectedImage(null);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const addStackItem = () => {
        if (newStackItem && !user.stack.includes(newStackItem)) {
            setUser({ ...user, stack: [...user.stack, newStackItem] });
            setNewStackItem('');
        }
    };

    const removeStackItem = (item: string) => {
        setUser({ ...user, stack: user.stack.filter(i => i !== item) });
    };

    return (
        <div className="min-h-screen pt-24 px-6 max-w-6xl mx-auto pb-40">

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN: Identity & Actions */}
                <div className="md:col-span-4 space-y-6 md:sticky md:top-24">
                    <SpotlightCard className="p-8 flex flex-col items-center text-center" noHover>
                        {/* Avatar */}
                        <div className="relative group w-40 h-40 mb-6 mx-auto">
                            <div className="w-full h-full aspect-square rounded-none border border-border bg-surface shadow-none overflow-hidden">
                                <img
                                    src={user.avatar || undefined}
                                    className="w-full h-full object-cover"
                                    alt={user.name}
                                />
                            </div>
                            {isEditing && (
                                <label className="absolute inset-0 bg-black/50 rounded-none flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Camera className="text-white" />
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarSelect}
                                    />
                                </label>
                            )}
                        </div>

                        {/* Identity */}
                        <div className="w-full space-y-4 mb-8">
                            {isEditing ? (
                                <div className="space-y-4 w-full">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest font-mono">Display Name</label>
                                        <input
                                            className="text-xl font-bold text-center text-foreground bg-background border border-border focus:border-primary outline-none w-full p-2 font-mono uppercase rounded-none"
                                            value={user.name}
                                            onChange={(e) => setUser({ ...user, name: e.target.value })}
                                            placeholder="YOUR NAME"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest font-mono">Handle</label>
                                        <div className="flex items-center justify-center gap-1 text-muted bg-element border border-border p-2 opacity-75 cursor-not-allowed">
                                            <span className="font-mono">@</span>
                                            <input
                                                className="text-sm font-bold bg-transparent border-none outline-none w-full text-left text-muted font-mono"
                                                value={user.handle.replace('@', '')}
                                                readOnly
                                                title="Username cannot be changed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-1">
                                    <h1 className="text-3xl font-bold text-foreground tracking-tight uppercase">{user.name}</h1>
                                    <p className="text-muted font-bold font-mono text-sm">{user.handle}</p>
                                </div>
                            )}

                            {/* Role Badge */}
                            {user.role && !isEditing && (
                                <div className="pt-2 text-center">
                                    <span className="inline-flex px-3 py-1 rounded-none bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                                        {user.role}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="w-full flex gap-3 mb-8">
                            {isOwnProfile ? (
                                isEditing ? (
                                    <div className="flex gap-3 w-full">
                                        <button onClick={() => { setIsEditing(false); setUser(initialUser); }} className="flex-1 py-3 bg-background border border-border text-muted-foreground rounded-none font-bold hover:bg-border hover:text-foreground transition-all text-xs uppercase tracking-wider">
                                            Cancel
                                        </button>
                                        <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-primary text-primary-fg rounded-none font-bold shadow-hard flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 text-xs uppercase tracking-wider border border-transparent active:translate-y-0.5 active:shadow-none">
                                            {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-element border border-border text-foreground rounded-none font-bold hover:border-primary hover:text-primary transition-all shadow-none flex items-center justify-center gap-2 text-xs uppercase tracking-wider hover:bg-primary/5">
                                        <Edit2 size={16} /> Edit Profile
                                    </button>
                                )
                            ) : (
                                <button
                                    onClick={() => onMessage && onMessage(user)}
                                    className="w-full py-3 bg-primary text-primary-fg rounded-none font-bold shadow-hard flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform uppercase tracking-wider border border-transparent active:translate-y-0 active:shadow-none"
                                >
                                    <MessageSquare size={18} /> Message
                                </button>
                            )}
                        </div>

                        {/* Socials Divider */}
                        <div className="w-full h-px bg-border mb-6"></div>

                        {/* Socials List */}
                        <div className="w-full space-y-3">
                            <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest text-left mb-2 font-mono">Connect</h3>
                            {isEditing ? (
                                <>
                                    <div className="flex items-center gap-3 p-3 rounded-none bg-background border border-border">
                                        <Github size={18} className="text-muted shrink-0" />
                                        <input
                                            className="bg-transparent outline-none w-full text-sm font-mono"
                                            placeholder="GITHUB USERNAME"
                                            value={user.github || ''}
                                            onChange={(e) => setUser({ ...user, github: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-none bg-background border border-border">
                                        <Globe size={18} className="text-muted shrink-0" />
                                        <input
                                            className="bg-transparent outline-none w-full text-sm font-mono"
                                            placeholder="WEBSITE URL"
                                            value={user.website || ''}
                                            onChange={(e) => setUser({ ...user, website: e.target.value })}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {user.github && (
                                        <a href={`https://github.com/${user.github.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '').replace(/\/$/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-none bg-background border border-border group cursor-pointer hover:border-primary transition-colors hover:bg-primary/5">
                                            <Github size={18} className="text-muted group-hover:text-primary" />
                                            <span className="font-mono text-sm font-bold truncate">github.com/{user.github.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '').replace(/\/$/, '')}</span>
                                        </a>
                                    )}
                                    {user.website && (
                                        <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-none bg-background border border-border group cursor-pointer hover:border-primary transition-colors hover:bg-primary/5">
                                            <Globe size={18} className="text-muted group-hover:text-primary" />
                                            <span className="font-mono text-sm font-bold truncate">{user.website.replace(/^https?:\/\//, '')}</span>
                                        </a>
                                    )}
                                    {!user.github && !user.website && (
                                        <div className="text-sm text-muted italic text-left font-mono">No socials added</div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Logout Button (Moved to bottom) */}
                        {isOwnProfile && !isEditing && (
                            <div className="w-full mt-8 pt-6 border-t border-border">
                                <button
                                    onClick={logout}
                                    className="w-full py-3 bg-element border border-gruv-red/50 text-gruv-red rounded-none font-bold hover:bg-gruv-red hover:text-gruv-bg transition-colors flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
                                >
                                    <LogOut size={18} /> Sign Out
                                </button>
                            </div>
                        )}
                    </SpotlightCard>
                </div>

                {/* RIGHT COLUMN: Details */}
                <div className="md:col-span-8 space-y-6">

                    {/* About Me */}
                    <SpotlightCard className="p-8" noHover>
                        <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2 font-mono">
                            <span className="w-1.5 h-1.5 rounded-none bg-primary"></span>
                            About Me
                        </h3>
                        {isEditing ? (
                            <textarea
                                className="w-full h-40 bg-background border border-border rounded-none p-4 text-foreground font-medium focus:border-primary focus:outline-none resize-none leading-relaxed font-mono text-sm"
                                value={user.bio}
                                onChange={(e) => setUser({ ...user, bio: e.target.value })}
                                placeholder="TELL US ABOUT YOURSELF..."
                            />
                        ) : (
                            <p className="text-lg leading-relaxed text-foreground/90 font-medium whitespace-pre-wrap">
                                {user.bio || "No bio yet."}
                            </p>
                        )}
                    </SpotlightCard>

                    {/* Stack */}
                    <SpotlightCard className="p-8" noHover>
                        <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2 font-mono">
                            <span className="w-1.5 h-1.5 rounded-none bg-blue-500"></span>
                            Tech Stack
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {user.stack.map(tech => (
                                <span key={tech} className="px-4 py-2 bg-element border border-border rounded-none text-xs font-bold text-foreground flex items-center gap-2 hover:border-primary/50 transition-colors cursor-default uppercase tracking-wide font-mono">
                                    {tech}
                                    {isEditing && (
                                        <button onClick={() => removeStackItem(tech)} className="text-muted hover:text-red-500 transition-colors"><X size={14} /></button>
                                    )}
                                </span>
                            ))}
                            {isEditing && (
                                <div className="flex items-center gap-2">
                                    <input
                                        className="bg-background border border-border rounded-none px-3 py-2 text-xs font-bold focus:border-primary outline-none w-32 font-mono uppercase"
                                        placeholder="ADD TECH..."
                                        value={newStackItem}
                                        onChange={(e) => setNewStackItem(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addStackItem()}
                                    />
                                    <button onClick={addStackItem} className="p-2 bg-primary text-primary-fg rounded-none hover:brightness-110 border border-transparent"><Plus size={16} /></button>
                                </div>
                            )}
                        </div>
                    </SpotlightCard>

                    {/* Vibe & Interests removed */}

                </div>

            </div>

            {/* Avatar Crop Modal */}
            {showCropModal && selectedImage && (
                <AvatarCropModal
                    imageSrc={selectedImage}
                    onConfirm={handleAvatarCropConfirm}
                    onCancel={handleAvatarCropCancel}
                />
            )}
        </div>
    );
};
