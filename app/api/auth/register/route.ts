// MongoDB Auth API - Register
// Handles new user registration with email/password
// Stores user in MongoDB with a hashed password

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, full_name, role = 'student', institution_id } = body;

        if (!email || !password || !full_name) {
            return NextResponse.json({ error: 'Email, password, and full name are required.' }, { status: 400 });
        }

        await connectToDatabase();

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create the user
        const newUser = await User.create({
            id: `mongo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email,
            full_name,
            role,
            status: 'active',
            email_verified: false,
            is_solo: !institution_id,
            institution_id,
            password: hashedPassword,
            created_at: new Date(),
        });

        return NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                email: newUser.email,
                full_name: newUser.full_name,
                role: newUser.role,
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('Register Error:', error);
        return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
    }
}
