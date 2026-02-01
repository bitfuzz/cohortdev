
import { Client, Databases, Users } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
    // 1. Initialize Admin Client
    // Hardcoding endpoint to ensure it hits the correct region (Singapore)
    const endpoint = 'https://sgp.cloud.appwrite.io/v1';
    console.log(`Initializing client with endpoint: ${endpoint} and project: ${process.env.APPWRITE_FUNCTION_PROJECT_ID}`);

    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const users = new Users(client);

    try {
        // 2. Identify the User
        const userId = req.headers['x-appwrite-user-id'];

        if (!userId) {
            error("Unauthorized: No user ID found in request headers.");
            return res.json({ success: false, message: "Unauthorized" }, 401);
        }

        log(`Starting account deletion for User ID: ${userId}`);

        // 3. Delete the User's Document
        try {
            await databases.deleteDocument(
                process.env.DATABASE_ID,
                process.env.COLLECTION_USERS,
                userId
            );
            log(`Document deleted for ${userId}`);
        } catch (dbError) {
            if (dbError.code !== 404) {
                throw dbError;
            }
            log(`Document not found (or already deleted), proceeding to Auth deletion.`);
        }

        // 4. Delete the Auth Account
        await users.delete(userId);
        log(`Auth account deleted for ${userId}`);

        return res.json({
            success: true,
            message: "Account and data successfully deleted."
        });

    } catch (err) {
        error(`Failed to delete account: ${err.message}`);
        return res.json({
            success: false,
            message: "Internal Server Error",
            error: err.message
        }, 500);
    }
};
