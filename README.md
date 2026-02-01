# CohortDev

**High-Performance Team Formation Platform for Hackathons**

[Features](#features) • [Tech Stack](#tech-stack) • [Architecture](#architecture) • [Getting Started](#getting-started)

---

## Overview

CohortDev is a real-time Single Page Application (SPA) designed to solve the chaos of hackathon team formation. It replaces messy Discord channels and spreadsheets with a structured, automated platform where participants can match based on skills, chat in real-time, and form teams instantly.

Built with React 19 and a Serverless architecture, it focuses on performance, type safety, and a distinct "industrial" design aesthetic that stands out from standard UI kits.

## Key Features

- **Real-Time Collaboration**: Instant messaging and team invites powered by WebSockets (Appwrite Realtime). No polling, no lag.
- **Smart Matching**: Users can filter potential teammates by tech stack (React, Python, Go, etc.) and role.
- **Industrial Design System**: A custom-built CSS/Tailwind design system featuring glassmorphism, micro-interactions, and a bespoke "hacker" aesthetic.
- **Secure Authentication**: Robust RBAC (Role-Based Access Control) ensures users can only edit their own data.
- **Zero-Trust Deletion**: A dedicated server-side function handles account deletion, ensuring all user data (Auth + DB) is scrubbed instantly and securely.
- **Optimistic UI**: Interactions feel instant with optimistic state updates while data persists in the background.

## Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS + Custom CSS Variables
- **State Management**: React Context API + Custom Hooks
- **Icons**: Lucide React

### Backend (BaaS)
- **Core**: Appwrite Cloud (Auth, Databases, Storage)
- **Functions**: Node.js (Serverless functions for admin tasks)
- **Realtime**: Appwrite Realtime (WebSocket)

## Architecture

The project follows a Serverless model to ensure scalability and reduce maintenance overhead.

1.  **Client-Side Logic**: The React app handles all UI, routing, and validation.
2.  **Security Layer**: Row-level security is enforced via Appwrite's permission system (`documentSecurity`).
3.  **Edge Functions**: Sensitive operations (like cascading account deletion) are offloaded to secure server-side functions, preventing logic leakage to the client.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/cohortdev.git
    cd cohortdev
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```bash
    cp .env.example .env
    ```
    
    Populate it with your Appwrite credentials (or ask for the project keys):
    ```env
    VITE_APP_URL=http://localhost:3000
    VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
    VITE_APPWRITE_PROJECT_ID=your_project_id
    VITE_APPWRITE_DATABASE_ID=your_db_id
    VITE_APPWRITE_BUCKET_ID=your_bucket_id
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```

## Deployment

The application is built to be deployed on any static site host (Vercel, Netlify, Cloudflare Pages).

1.  **Push to GitHub**
2.  **Import to Vercel/Netlify**
3.  **Add Environment Variables** (Critical!)
    You MUST add the following variables in your hosting dashboard's "Settings > Environment Variables" section. Do NOT rely on `.env` files in production.
    
    | Variable | Value (Example) |
    | :--- | :--- |
    | `VITE_APP_URL` | `https://your-project.vercel.app` (Your Setup URL) |
    | `VITE_APPWRITE_ENDPOINT` | `https://cloud.appwrite.io/v1` |
    | `VITE_APPWRITE_PROJECT_ID` | `...` |
    | `VITE_APPWRITE_DATABASE_ID` | `...` |
    | `VITE_APPWRITE_BUCKET_ID` | `...` |
    | `VITE_APP_DEBUG_API_KEY` | *(Optional, technically needed for debug mode)* |

4.  **Build Command**: `npm run build`
5.  **Output Directory**: `dist`

