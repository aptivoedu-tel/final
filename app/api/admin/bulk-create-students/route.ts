import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { User, Institution } from '@/lib/mongodb/models';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { students, institutionId } = body;

        if (!students || !Array.isArray(students) || !institutionId) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        await connectToDatabase();

        const institution = await Institution.findOne({ id: parseInt(institutionId) });
        if (!institution) {
            return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
        }

        if (!institution.domain) {
            return NextResponse.json({
                error: `Institution "${institution.name}" has no domain assigned. Please contact Super Admin.`
            }, { status: 400 });
        }

        const domain = institution.domain.toLowerCase().trim();
        const results = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: [] as string[]
        };

        // Pre-fetch existing emails to avoid collisions
        const existingUsers = await User.find({ role: 'student' }, { email: 1 }).lean();
        const existingEmails = new Set(existingUsers.map((u: any) => u.email.toLowerCase()));

        const BATCH_SIZE = 50;
        for (let i = 0; i < students.length; i += BATCH_SIZE) {
            const batch = students.slice(i, i + BATCH_SIZE);

            const createPromises = batch.map(async (student: any) => {
                const name = student.name || student.Name;
                const rollNo = student.studentId || student.RollNo || student.rollno || student.RollNumber;
                let password = student.password || student.Password;

                if (!name || !rollNo) {
                    results.failed++;
                    results.errors.push(`Row ${i + 1}: Name or Roll Number missing`);
                    return;
                }

                const email = `${rollNo}@${domain}`;
                if (existingEmails.has(email.toLowerCase())) {
                    results.skipped++;
                    return;
                }

                try {
                    if (!password) {
                        password = Math.random().toString(36).slice(-8);
                    }
                    const hashedPassword = await bcrypt.hash(password, 12);
                    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                    await User.create({
                        id: userId,
                        email: email.toLowerCase(),
                        full_name: name,
                        password: hashedPassword,
                        role: 'student',
                        status: 'active',
                        email_verified: true,
                        institution_id: parseInt(institutionId),
                        student_id_code: rollNo.toString(),
                        initial_password: password, // Store for admin reference
                        created_at: new Date()
                    });

                    existingEmails.add(email.toLowerCase());
                    results.success++;
                } catch (err: any) {
                    results.failed++;
                    results.errors.push(`${name}: ${err.message}`);
                }
            });

            await Promise.all(createPromises);
        }

        return NextResponse.json({
            success: true,
            summary: results
        });

    } catch (error: any) {
        console.error('Bulk Upload Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
