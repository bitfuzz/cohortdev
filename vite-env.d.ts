/// <reference types="vite/client" />

declare module '*.module.css' {
    const classes: { [key: string]: string };
    export default classes;
}

interface ImportMetaEnv {
    readonly VITE_APP_URL: string
    readonly VITE_APPWRITE_ENDPOINT: string
    readonly VITE_APPWRITE_PROJECT_ID: string
    readonly VITE_APPWRITE_DATABASE_ID: string
    readonly VITE_APPWRITE_BUCKET_ID: string
    readonly VITE_APP_DEBUG_API_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
