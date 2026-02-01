import React, { useState, useRef } from 'react';
import { ArrowRight, Code, Terminal, Palette, Zap, Check, Upload, Github, Globe, X, Plus, Smartphone, PenTool, Layout, Cloud } from 'lucide-react';
import { SpotlightCard } from '../components/ui/SpotlightCard';
import { AvatarCropModal } from '../components/ui/AvatarCropModal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { databases, storage, COLLECTIONS, DATABASE_ID, BUCKET_ID, getStorageFileUrl } from '../lib/appwrite';
import { ID, Permission, Role, Query } from 'appwrite';

interface OnboardingProps {
  onComplete: () => void;
}

interface Step {
  id: string;
  title: string;
  subtitle: string;
  multi: boolean;
  type?: 'form' | 'tags' | 'socials';
  options?: {
    id: string;
    label: string;
    icon: any;
    desc?: string;
  }[];
}

const steps: Step[] = [
  {
    id: 'identity',
    title: "Who are you?",
    subtitle: "Let's get your profile set up.",
    multi: false,
    type: 'form'
  },
  {
    id: 'skills',
    title: "What's your stack?",
    subtitle: "List the tools and languages you use most.",
    multi: false,
    type: 'tags'
  },
  {
    id: 'socials',
    title: "Where can we find you?",
    subtitle: "Link your work and socials.",
    multi: false,
    type: 'socials'
  }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { user, checkUser } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  // Form State
  const [tags, setTags] = useState<string[]>([]);
  const [name, setName] = useState(user?.name || '');
  const [handle, setHandle] = useState('');
  const [handleError, setHandleError] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [stack, setStack] = useState<string[]>([]);
  const [newStackItem, setNewStackItem] = useState('');
  const [github, setGithub] = useState('');
  const [website, setWebsite] = useState('');

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const currentStep = steps[stepIndex];

  const handleSelect = (id: string) => {
    if (currentStep.multi) {
      if (selected.includes(id)) {
        setSelected(selected.filter(s => s !== id));
      } else {
        setSelected([...selected, id]);
      }
    } else {
      setSelected([id]);
      // Auto advance for single select
      setTimeout(() => {
        handleNext([id]);
      }, 300);
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
      setAvatarUrl(url);
      setShowCropModal(false);
      setSelectedImage(null);
    } catch (error) {
      console.error("Failed to upload avatar", error);
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

  const checkHandleAvailability = async (checkHandle: string) => {
    if (!checkHandle) return false;
    // Remove @ if present for check
    const cleanHandle = checkHandle.startsWith('@') ? checkHandle.substring(1) : checkHandle;
    // We store handles with @ usually, but let's check how we save it.
    // In saveProfile: handle: handle || `@${ user.name... } `.
    // So we should check for exact match or match with @.

    // Actually, let's enforce @ prefix in storage but check flexibly.
    const handleToQuery = cleanHandle.startsWith('@') ? cleanHandle : `@${cleanHandle}`;

    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        [
          Query.equal('handle', handleToQuery)
        ]
      );

      // If we find a user with this handle, and it's NOT the current user (though user doc might not exist yet)
      // Since this is onboarding, we assume if we find ANY match, it's taken.
      // Unless the user is re-onboarding? But usually onboarding is one-time.
      if (response.documents.length > 0) {
        // Check if it's me
        if (response.documents[0].$id === user?.$id) {
          return true; // It's me, so it's available to me
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking handle availability", error);
      return true; // Assume available on error to not block? Or block? Let's assume available.
    }
  };

  const { addToast } = useToast();

  const handleNext = async (currentSelection = selected) => {
    // Validation for Identity Step
    if (currentStep.id === 'identity') {
      if (!name || name.length < 2 || name.length > 50) {
        addToast("Name must be between 2 and 50 characters.", 'error');
        return;
      }

      if (!handle || handle.length < 3 || handle.length > 20) {
        setHandleError("Handle must be between 3 and 20 characters.");
        return;
      }

      // Format handle
      const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
      setHandle(formattedHandle);

      const isAvailable = await checkHandleAvailability(formattedHandle);
      if (!isAvailable) {
        setHandleError("This handle is already taken. Please choose another.");
        return;
      }
      setHandleError("");
    }

    if (currentStep.id === 'socials') {
      // Parse GitHub URL if present
      if (github) {
        let cleanGithub = github.trim();
        // If it's a full URL, extract username
        const urlMatch = cleanGithub.match(/github\.com\/([^\/]+)\/?$/);
        if (urlMatch && urlMatch[1]) {
          cleanGithub = urlMatch[1];
          setGithub(cleanGithub); // Update state
        } else if (cleanGithub.includes('/')) {
          // Invalid URL format but contains slash
          addToast("Invalid GitHub URL. Please use 'github.com/username' or just 'username'.", 'error');
          return;
        }
        // If just username, leave as is
      }
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      setSelected([]);
    } else {
      // Final step - Save to DB
      await saveProfile();
      await checkUser(); // Update context to reflect new user doc
      onComplete();
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const profileData = {
        name: name,
        email: user.email,
        role: stack.length > 0 ? stack[0] : 'Developer', // Default role from stack or generic
        tags: tags,
        avatar: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.$id}`,
        bio: bio || "", // Ensure empty string if no bio
        handle: handle,
        stack: stack,
        github: github, // Should be cleaned by handleNext
        website: website,
        isOnline: true,
        githubActivity: [], // Initialize empty
      };

      // Try to create document with user ID
      try {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          user.$id,
          profileData,
          [
            Permission.read(Role.any()),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
          ]
        );
      } catch (e: any) {
        // If exists, update it
        if (e.code === 409) {
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.USERS,
            user.$id,
            profileData
          );
        } else {
          throw e;
        }
      }
    } catch (error: any) {
      console.error("Failed to save profile", error);
      addToast(`Failed to save profile: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    if (currentStep.type === 'form') {
      return (
        <div className="space-y-6 max-w-md mx-auto">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div
              className="w-24 h-24 rounded-none bg-surface border border-dashed border-border flex items-center justify-center cursor-pointer overflow-hidden relative group hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Upload className="text-muted group-hover:text-primary transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-bold uppercase tracking-wider">Change</span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarSelect}
            />
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Upload a profile picture</span>
          </div >

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface border border-border rounded-none py-3 px-4 font-bold text-foreground focus:border-primary focus:outline-none transition-colors font-mono uppercase"
              placeholder="YOUR NAME"
              minLength={2}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Handle</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-muted font-bold font-mono">@</span>
              <input
                value={handle.replace('@', '')}
                onChange={(e) => {
                  setHandle(e.target.value);
                  setHandleError('');
                }}
                className={`w-full bg-surface border rounded-none py-3 pl-8 pr-4 font-bold text-foreground focus:outline-none transition-colors font-mono uppercase ${handleError ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'}`}
                placeholder="USERNAME"
                minLength={3}
                maxLength={20}
              />
            </div>
            {handleError && (
              <p className="text-red-500 text-xs font-bold mt-1 uppercase tracking-wide">{handleError}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-surface border border-border rounded-none py-3 px-4 font-medium text-foreground focus:border-primary focus:outline-none transition-colors min-h-[100px] resize-none font-mono text-sm"
              placeholder="TELL US ABOUT YOURSELF..."
            />
          </div>
        </div >
      );
    }

    if (currentStep.type === 'tags') {
      return (
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex gap-2">
            <input
              value={newStackItem}
              onChange={(e) => setNewStackItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newStackItem.trim()) {
                  if (!stack.includes(newStackItem.trim())) {
                    setStack([...stack, newStackItem.trim()]);
                  }
                  setNewStackItem('');
                }
              }}
              className="flex-1 bg-surface border border-border rounded-none py-3 px-4 font-medium text-foreground focus:border-primary focus:outline-none transition-colors font-mono uppercase text-sm"
              placeholder="ADD A TECH (E.G. REACT, PYTHON)..."
            />
            <button
              onClick={() => {
                if (newStackItem.trim()) {
                  if (!stack.includes(newStackItem.trim())) {
                    setStack([...stack, newStackItem.trim()]);
                  }
                  setNewStackItem('');
                }
              }}
              className="bg-primary text-primary-fg px-4 rounded-none font-bold border border-transparent hover:brightness-110"
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {stack.map(tech => (
              <div key={tech} className="bg-surface border border-border px-3 py-1.5 rounded-none flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wide font-mono">{tech}</span>
                <button
                  onClick={() => setStack(stack.filter(s => s !== tech))}
                  className="text-muted hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {stack.length === 0 && (
              <p className="text-muted text-xs italic font-mono uppercase tracking-wide">No skills added yet.</p>
            )}
          </div>
        </div>
      );
    }

    if (currentStep.type === 'socials') {
      return (
        <div className="max-w-md mx-auto space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <Github size={16} /> GitHub URL
            </label>
            <input
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              className="w-full bg-surface border border-border rounded-none py-3 px-4 font-medium text-foreground focus:border-primary focus:outline-none transition-colors font-mono text-sm"
              placeholder="https://github.com/username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <Globe size={16} /> Portfolio / Website
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full bg-surface border border-border rounded-none py-3 px-4 font-medium text-foreground focus:border-primary focus:outline-none transition-colors font-mono text-sm"
              placeholder="https://yoursite.com"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentStep.options?.map((opt) => {
          const isSelected = selected.includes(opt.id);
          const Icon = opt.icon;

          return (
            <SpotlightCard
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={`
                cursor-pointer group
                ${isSelected ? 'border-primary ring-1 ring-primary' : ''}
              `}
            >
              <div className="p-8 flex items-center gap-6">
                <div className={`
                  p-4 rounded-none transition-all duration-300 border border-transparent
                  ${isSelected ? 'bg-primary text-primary-fg shadow-hard' : 'bg-background text-foreground border-border'}
                `}>
                  <Icon size={28} strokeWidth={2.5} />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                    {opt.label}
                  </h3>
                  {opt.desc && (
                    <p className="text-xs text-muted mt-1.5 font-bold uppercase tracking-wide font-mono">{opt.desc}</p>
                  )}
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-none bg-primary flex items-center justify-center border border-primary-fg">
                    <Check size={16} className="text-primary-fg" strokeWidth={3} />
                  </div>
                )}
              </div>
            </SpotlightCard>
          )
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full">

        {/* Progress */}
        <div className="flex gap-1 mb-12 justify-center">
          {steps.map((_, idx) => (
            <div key={idx} className={`h-2 w-12 rounded-none transition-colors duration-300 ${idx <= stepIndex ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6 tracking-tight uppercase">
            {currentStep.title}
          </h1>
          <p className="text-xl text-muted font-bold max-w-lg mx-auto leading-relaxed font-mono uppercase tracking-wide">
            {currentStep.subtitle}
          </p>
        </div>

        {renderStepContent()}

        {/* Multi-select Continue Button */}
        {currentStep.multi && selected.length > 0 && (
          <div className="flex justify-center mt-12">
            <button
              onClick={() => handleNext()}
              className="px-8 py-4 bg-primary text-primary-fg font-bold rounded-none shadow-hard hover:-translate-y-0.5 transition-all flex items-center gap-3 group uppercase tracking-wider border border-transparent active:translate-y-0 active:shadow-none"
            >
              Continue
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Form Continue Button */}
        {(currentStep as any).type && (
          <div className="flex justify-center mt-12 gap-4">
            {stepIndex > 0 && (
              <button
                onClick={() => setStepIndex(stepIndex - 1)}
                className="px-8 py-4 bg-surface border border-border text-foreground font-bold rounded-none hover:bg-border transition-all uppercase tracking-wider"
              >
                Back
              </button>
            )}
            <button
              onClick={() => handleNext()}
              disabled={saving}
              className="px-8 py-4 bg-primary text-primary-fg font-bold rounded-none shadow-hard hover:-translate-y-0.5 transition-all flex items-center gap-3 group disabled:opacity-50 uppercase tracking-wider border border-transparent active:translate-y-0 active:shadow-none"
            >
              {saving ? 'SAVING...' : stepIndex === steps.length - 1 ? 'FINISH' : 'CONTINUE'}
              {!saving && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        )}
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
