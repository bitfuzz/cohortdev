import React from 'react';
import { Home, Search, MessageSquare, User, Briefcase } from 'lucide-react';
import { ViewState } from '../../types';

interface DockProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isViewingOwnProfile: boolean;
  hasUnread?: boolean;
}

export const Dock: React.FC<DockProps> = ({ currentView, onChangeView, isViewingOwnProfile, hasUnread }) => {
  const items = [
    { id: 'FEED', icon: Home, label: 'Feed', view: 'FEED' },
    { id: 'MESSAGES', icon: MessageSquare, label: 'Messages', view: 'CHAT' },
    { id: 'PROFILE', icon: User, label: 'Profile', view: 'PROFILE' },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-4 px-6 py-3 bg-surface border-2 border-border rounded-2xl shadow-xl backdrop-blur-md">
        {items.map((item) => {
          // Special logic for Profile: only active if view is PROFILE AND we are viewing our own profile
          let isActive = currentView === item.view;
          if (item.view === 'PROFILE' && !isViewingOwnProfile) {
            isActive = false;
          }

          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.view as ViewState)}
              className={`
                relative group flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ease-out
                ${isActive
                  ? 'bg-primary text-primary-fg shadow-lg shadow-primary/20'
                  : 'text-muted hover:bg-border hover:text-foreground'
                }
              `}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />

              {/* Unread Indicator */}
              {item.id === 'MESSAGES' && hasUnread && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-surface animate-pulse"></span>
              )}

              {/* Tooltip */}
              <span className="absolute -top-14 px-3 py-1 bg-foreground text-background border border-border rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl transform translate-y-2 group-hover:translate-y-0">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  );
};