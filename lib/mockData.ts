
import { User } from '../types';

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Alex Rivera',
  handle: '@arivera',
  avatar: 'https://picsum.photos/seed/alex/200/200',
  role: 'Frontend',
  bio: 'Obsessed with pixel perfection and framer motion.',
  tags: ['Designer', 'Shipper'],
  stack: ['React', 'TypeScript', 'Tailwind'],
  githubActivity: [12, 45, 23, 10, 56, 78, 45, 32, 67, 89],
};

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    handle: '@schen_dev',
    avatar: 'https://picsum.photos/seed/sarah/200/200',
    role: 'Backend',
    bio: 'Rust evangelist. Building scalable distributed systems.',
    tags: ['Architect', 'Midnight Coder'],
    stack: ['Rust', 'Go', 'Postgres'],
    githubActivity: [10, 20, 40, 60, 80, 50, 30, 90, 100, 20],
    isOnline: true,
    status: 'Coding',
  },
  {
    id: '2',
    name: 'Marcus Jo',
    handle: '@marcus_ai',
    avatar: 'https://picsum.photos/seed/marcus/200/200',
    role: 'AI/ML',
    bio: 'Fine-tuning LLMs on my laptop. Python all the way.',
    tags: ['Researcher', 'Chill'],
    stack: ['Python', 'PyTorch', 'LangChain'],
    githubActivity: [5, 5, 10, 5, 20, 15, 10, 5, 30, 50],
    isOnline: false,
    status: 'AFK',
  },
  {
    id: '3',
    name: 'Elena Boyd',
    handle: '@elena_des',
    avatar: 'https://picsum.photos/seed/elena/200/200',
    role: 'Designer',
    bio: 'Making things pop. Figma wizard.',
    tags: ['Visuals', 'UI/UX'],
    stack: ['Figma', 'Spline', 'CSS'],
    githubActivity: [2, 4, 2, 8, 12, 5, 20, 15, 10, 5],
    isOnline: true,
    status: 'In Figma',
  },
  {
    id: '4',
    name: 'David Kim',
    handle: '@dkim_full',
    avatar: 'https://picsum.photos/seed/david/200/200',
    role: 'Fullstack',
    bio: 'I ship products in weekends. Next.js fanboy.',
    tags: ['Shipper', 'Founder'],
    stack: ['Next.js', 'Prisma', 'TRPC'],
    githubActivity: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
    isOnline: false,
  }
];
