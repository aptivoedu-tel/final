import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../../lib/mongodb/connection';
import { University } from '../../../../../lib/mongodb/models';
import { AuthService } from '../../../../../lib/services/authService';

export async function GET(request: Request) {
    try {
        await connectToDatabase();

        // Fetch all universities, sort by name
        const universities = await University.find({}).sort({ name: 1 }).lean();

        return NextResponse.json({ universities });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        await connectToDatabase();
        const body = await request.json();
        const { id, show_on_landing } = body;

        if (id === undefined || show_on_landing === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const university = await University.findOneAndUpdate(
            { id },
            { $set: { show_on_landing } },
            { new: true }
        );

        if (!university) {
            return NextResponse.json({ error: 'University not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Success', university });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
