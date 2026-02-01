import { Client, Account, Databases, Storage, Functions, Query } from 'appwrite';

// Configuration
export const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
export const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;

// Initialize Client
export const client = new Client()
    .setEndpoint(import.meta.env.PROD ? '/api/appwrite' : ENDPOINT)
    .setProject(PROJECT_ID);

// Export Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export { Query, ID, Permission, Role } from 'appwrite';

// Helper to get current URL for redirects
export const getURL = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return import.meta.env.VITE_APP_URL;
};

// Collection IDs (We will create these in the console)
export const COLLECTIONS = {
    USERS: 'users',
    TEAMS: 'teams',
    MESSAGES: 'messages',
    INVITES: 'invites',
    CONVERSATIONS: 'conversations',
};

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID; // Ensure this bucket exists in your Appwrite Console

// Helper to get storage file URL
export const getStorageFileUrl = (fileId: string) => {
    return `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
};

