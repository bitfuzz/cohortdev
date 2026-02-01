import React, { useState, useEffect } from 'react';
import { Moon, Sun, Shield, Coffee, ChevronLeft, Palette } from 'lucide-react';
import { User } from '../types';
import { databases, DATABASE_ID, COLLECTIONS } from '../lib/appwrite';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

interface SettingsProps {
    onBack: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    accent: string;
    setAccent: (color: string) => void;
}

const ACCENT_COLORS = [
    { id: 'red', value: 'var(--red)', name: 'Red' },
    { id: 'orange', value: 'var(--orange)', name: 'Orange' },
    { id: 'yellow', value: 'var(--yellow)', name: 'Yellow' },
    { id: 'green', value: 'var(--green)', name: 'Green' },
    { id: 'aqua', value: 'var(--aqua)', name: 'Aqua' },
    { id: 'blue', value: 'var(--blue)', name: 'Blue' },
    { id: 'purple', value: 'var(--purple)', name: 'Purple' },
];

export const Settings: React.FC<SettingsProps> = ({ onBack, theme, toggleTheme, accent, setAccent }) => {
    const { user, checkUser, deleteAccount } = useAuth();
    const { addToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user) {
                try {
                    const doc = await databases.getDocument(
                        DATABASE_ID,
                        COLLECTIONS.USERS,
                        user.$id
                    );
                    setUserProfile({
                        id: doc.$id,
                        name: doc.name,
                        handle: doc.handle,
                        avatar: doc.avatar,
                        role: doc.role,
                        bio: doc.bio,
                        tags: doc.tags,
                        stack: doc.stack,
                        githubActivity: doc.githubActivity,
                        github: doc.github,
                        website: doc.website,
                        isHidden: doc.isHidden
                    } as User);
                } catch (error) {
                    console.error("Failed to fetch user profile", error);
                }
            }
        };
        fetchUserProfile();
    }, [user]);

    const togglePrivacy = async () => {
        if (!user || !userProfile) return;
        setSaving(true);
        try {
            const newIsHidden = !userProfile.isHidden;
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.USERS,
                user.$id,
                {
                    isHidden: newIsHidden
                }
            );
            setUserProfile({ ...userProfile, isHidden: newIsHidden });
            await checkUser(); // Refresh local user state if needed
        } catch (error) {
            console.error("Failed to update privacy settings", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 px-6 max-w-2xl mx-auto pb-40">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-surface rounded-none transition-colors border border-transparent hover:border-border">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-3xl font-bold uppercase tracking-tight">Settings</h1>
            </div>

            <div className="space-y-6">
                {/* Appearance */}
                <div className="p-6 bg-surface border border-border rounded-none shadow-hard">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-wide">
                        {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                        Appearance
                    </h2>
                    <div className="space-y-4">
                        {/* Theme Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold uppercase tracking-wide text-sm">Theme</p>
                                <p className="text-xs text-muted font-mono">SWITCH BETWEEN LIGHT AND DARK MODE</p>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="px-4 py-2 bg-background border border-border rounded-none font-bold hover:border-primary transition-colors uppercase tracking-wider text-xs"
                            >
                                {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                            </button>
                        </div>

                        {/* Accent Color */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Palette size={18} />
                                <p className="font-bold uppercase tracking-wide text-sm">Accent Color</p>
                            </div>
                            <p className="text-xs text-muted mb-3 font-mono uppercase">CHOOSE YOUR PRIMARY ACCENT COLOR</p>
                            <div className="flex gap-3 flex-wrap">
                                {ACCENT_COLORS.map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setAccent(color.id)}
                                        className={`w-12 h-12 rounded-none border transition-all hover:scale-105 ${accent === color.id ? 'border-foreground shadow-hard' : 'border-border'
                                            }`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Privacy */}
                <div className="p-6 bg-surface border border-border rounded-none shadow-hard">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-wide">
                        <Shield size={20} />
                        Privacy
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold uppercase tracking-wide text-sm">Hide Profile</p>
                            <p className="text-xs text-muted font-mono uppercase">HIDE YOUR PROFILE FROM THE PUBLIC FEED</p>
                        </div>
                        <button
                            onClick={togglePrivacy}
                            disabled={saving || !userProfile}
                            className={`w-14 h-6 rounded-none transition-colors relative border border-border ${userProfile?.isHidden ? 'bg-primary' : 'bg-background'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-foreground rounded-none transition-transform ${userProfile?.isHidden ? 'translate-x-8' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Support */}
                <div className="p-6 bg-surface border border-border rounded-none shadow-hard">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-wide">
                        <Coffee size={20} />
                        Support
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold uppercase tracking-wide text-sm">Buy me a coffee</p>
                            <p className="text-xs text-muted font-mono uppercase">SUPPORT THE DEVELOPMENT OF COHORT.DEV</p>
                        </div>
                        <a
                            href="https://buymeacoffee.com" // Placeholder
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-[#FFDD00] text-black font-bold rounded-none hover:brightness-110 transition-all flex items-center gap-2 uppercase tracking-wider text-xs border border-transparent"
                        >
                            <Coffee size={18} />
                            Donate
                        </a>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="p-6 bg-surface border border-red-500/30 rounded-none shadow-hard">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-wide text-red-500">
                        <Shield size={20} />
                        Danger Zone
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold uppercase tracking-wide text-sm text-red-500">Delete Account</p>
                            <p className="text-xs text-muted font-mono uppercase">PERMANENTLY DELETE YOUR ACCOUNT AND DATA</p>
                        </div>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 bg-red-500 text-white font-bold rounded-none hover:bg-red-600 transition-all flex items-center gap-2 uppercase tracking-wider text-xs border border-transparent"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border-2 border-red-500 rounded-none p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-bold text-red-500 mb-4 uppercase tracking-tight">Delete Account?</h3>
                        <p className="text-foreground mb-8 font-medium">
                            Are you sure you want to delete your account? This action cannot be undone and all your data will be lost.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-background border border-border text-foreground font-bold rounded-none hover:bg-border transition-colors uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await deleteAccount();
                                        setShowDeleteConfirm(false);
                                    } catch (error) {
                                        console.error("Delete failed", error);
                                        addToast("Failed to delete account. Please try again.", 'error');
                                    }
                                }}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-none hover:bg-red-600 transition-colors uppercase tracking-wider shadow-hard border border-transparent"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
