import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { Institution, User, InstitutionAdmin } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const institutions = await Institution.find()
            .sort({ created_at: -1 })
            .lean();

        return NextResponse.json({ institutions });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, institution_type, domain, contact_email, contact_phone, address, status } = body;

        await connectToDatabase();

        // Get next ID
        const lastInst = await Institution.findOne().sort({ id: -1 });
        const nextId = (lastInst?.id || 0) + 1;

        const newInst = await Institution.create({
            id: nextId,
            name,
            institution_type,
            domain,
            contact_email,
            contact_phone,
            address,
            status: status || 'pending',
            is_active: status === 'approved'
        });

        return NextResponse.json({ success: true, institution: newInst });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, adminId, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await connectToDatabase();

        // Handle Admin Linking
        if (adminId) {
            const adminUser = await User.findOne({ id: adminId });
            if (!adminUser) return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });

            // 1. Update/Upsert InstitutionAdmin mapping
            await InstitutionAdmin.findOneAndUpdate(
                { user_id: adminId, institution_id: id },
                { assigned_at: new Date() },
                { upsert: true }
            );

            // 2. Update user's primary institution
            await User.findOneAndUpdate({ id: adminId }, { $set: { institution_id: id } });

            // 3. Update institution metadata
            updates.admin_name = adminUser.full_name;
            updates.admin_email = adminUser.email;
        }

        const updated = await Institution.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updates },
            { new: true }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });

        return NextResponse.json({ success: true, institution: updated });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await connectToDatabase();

        await Institution.findOneAndDelete({ id: parseInt(id) });
        // Optional: cleanup mappings
        await InstitutionAdmin.deleteMany({ institution_id: parseInt(id) });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
