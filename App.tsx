import React, { useState, useEffect } from 'react';
import { Onboarding } from './pages/Onboarding';
import { Feed } from './pages/Feed';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Dock } from './components/ui/Dock';
import { ViewState, User } from './types';
import { LogIn } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';



const AppContent: React.FC = () => {
  const { user, userProfile, loading, isOnboarded, loginWithGoogle, unreadCount, setUnreadCount } = useAuth();

  const [view, setView] = useState<ViewState>('FEED');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });
  const [accent, setAccent] = useState('red');

  // Navigation State
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | 'TEAM'>('TEAM');

  // Handle Initial Redirects
  useEffect(() => {
    if (!loading) {
      if (user && !isOnboarded) {
        setView('ONBOARDING');
      } else if (user && isOnboarded && view === 'ONBOARDING') {
        setView('FEED');
      } else if (!user && view !== 'FEED') {
        setView('FEED');
      }
    }
  }, [user, loading, isOnboarded, view]);

  // Toggle Themes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Update CSS Variable for Primary Color
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', `var(--${accent})`);
  }, [accent]);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  const handleDockChange = (newView: ViewState) => {
    if (newView === 'PROFILE') {
      setSelectedUserProfile(null);
    }
    if (newView === 'CHAT') {
      setUnreadCount(0); // Clear unread when opening chat
    }
    setView(newView);
  };

  const handleViewProfile = (user: User) => {
    setSelectedUserProfile(user);
    setView('PROFILE');
  };

  const handleMessageUser = (targetUser: User) => {
    if (!user) {
      loginWithGoogle();
      return;
    }
    setActiveChatId(targetUser.id);
    setView('CHAT');
    setUnreadCount(0);
  };

  const renderView = () => {
    if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    switch (view) {
      case 'ONBOARDING':
        return <Onboarding onComplete={() => setView('FEED')} />;
      case 'FEED':
        return <Feed onViewProfile={handleViewProfile} onMessage={handleMessageUser} />;
      case 'CHAT':
        if (!user) return <div className="flex h-full items-center justify-center"><button onClick={loginWithGoogle} className="bg-primary px-6 py-3 rounded-xl text-primary-fg font-bold">Login to Chat</button></div>;
        return <Chat initialChatId={activeChatId} />;
      case 'PROFILE':
        // If logged out and trying to view own profile, show Feed instead
        if (!user && !selectedUserProfile) return <Feed onViewProfile={handleViewProfile} onMessage={handleMessageUser} />;

        return (
          <Profile
            user={selectedUserProfile || userProfile!}
            isOwnProfile={!selectedUserProfile || (user && selectedUserProfile.id === user.$id)}
            onMessage={handleMessageUser}
          />
        );
      case 'SETTINGS':
        return <Settings onBack={() => setView('FEED')} theme={theme} toggleTheme={toggleTheme} accent={accent} setAccent={setAccent} />;
      default:
        return <Feed onViewProfile={handleViewProfile} onMessage={handleMessageUser} />;
    }
  };

  // Determine if we are viewing our own profile for dock highlighting
  const isViewingOwnProfile = view === 'PROFILE' && (!selectedUserProfile || (user && selectedUserProfile.id === user.$id));

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans transition-colors duration-500">

      {/* Controls - Only visible on Feed/Home */}
      {view === 'FEED' && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 animate-in fade-in zoom-in duration-500">

          {/* Auth Button */}
          {!user && (
            <button
              onClick={loginWithGoogle}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-fg font-bold shadow-soft hover:scale-105 transition-transform flex items-center gap-2"
            >
              <LogIn size={18} />
              Login
            </button>
          )}

          {/* Settings Button (Only if logged in) */}
          {user && (
            <button
              onClick={() => setView('SETTINGS')}
              className="px-4 py-2.5 rounded-xl bg-surface text-foreground font-bold shadow-soft hover:scale-105 transition-transform border-2 border-border"
            >
              Settings
            </button>
          )}
        </div>
      )}

      {/* Subtle Background Pattern (Dot Grid) */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05]" style={{
        backgroundImage: `radial-gradient(var(--border) 2px, transparent 2px)`,
        backgroundSize: '32px 32px'
      }}></div>

      {/* Main Content */}
      <main className="relative z-10 w-full h-full">
        {renderView()}
      </main>

      {/* Navigation */}
      {view !== 'ONBOARDING' && user && isOnboarded && (
        <Dock
          currentView={view}
          onChangeView={handleDockChange}
          isViewingOwnProfile={isViewingOwnProfile}
          hasUnread={unreadCount > 0}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>

        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;