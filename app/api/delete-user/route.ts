// MongoDB-only: Delete User API
// Completely removes all Supabase dependencies

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { User as MongoUser } from '@/lib/mongodb/models';

export async function POST(request: Request) {
    let requestedUserId = 'unknown';
    try {
        const body = await request.json().catch(() => ({}));
        const { userId } = body;
        requestedUserId = userId || 'missing';

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        await connectToDatabase();

        // Check if userId is a valid ObjectId string for MongoDB (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);

        // Mongoose throws CastError if you query _id with a non-ObjectId string.
        // For mongo_... IDs, we only search by the 'id' field.
        const deleteQuery = isValidObjectId
            ? { $or: [{ id: userId }, { _id: userId }] }
            : { id: userId };

        console.log(`[DeleteUser] Attempting to delete user ${userId} with query:`, deleteQuery);

        // Delete from MongoDB users collection
        const result = await MongoUser.findOneAndDelete(deleteQuery);

        if (!result) {
            console.warn(`[DeleteUser] User not found with ID: ${userId}`);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log(`[DeleteUser] Successfully deleted user: ${userId}`);

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error: any) {
        console.error('[DeleteUser] Error:', {
            message: error.message,
            stack: error.stack,
            userId: requestedUserId
        });
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message,
            userId: requestedUserId
        }, { status: 500 });
    }
}
