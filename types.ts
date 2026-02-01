
export type Role = 'Frontend' | 'Backend' | 'Fullstack' | 'Designer' | 'Mobile' | 'AI/ML';

export interface TechStack {
  name: string;
  icon: string;
  category: 'language' | 'framework' | 'tool';
}

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  role: Role;
  bio: string;
  tags: string[]; // Tags e.g. "Shipper", "Architect"
  stack: string[];
  githubActivity: number[]; // Array of commit counts for sparkline
  github?: string;
  website?: string;
  isOnline?: boolean;
  isHidden?: boolean;
  status?: 'Coding' | 'AFK' | 'In Figma' | 'Meeting';
  teamId?: string;
}

export type ViewState = 'ONBOARDING' | 'FEED' | 'CHAT' | 'PROFILE' | 'SETTINGS';

export interface Invite {
  $id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
}

export interface Team {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  name: string;
  ownerId: string;
  adminId: string; // Same as ownerId initially, but explicit
  members: string[]; // Array of User IDs
}
