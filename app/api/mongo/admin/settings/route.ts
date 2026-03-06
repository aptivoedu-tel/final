import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { SystemSettings } from '@/lib/mongodb/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
    try {
        await connectToDatabase();
        let settings = await SystemSettings.findOne({ id: 'global_settings' });

        if (!settings) {
            settings = await SystemSettings.create({ id: 'global_settings' });
        }

        return NextResponse.json({ settings });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        await connectToDatabase();

        const updatedSettings = await SystemSettings.findOneAndUpdate(
            { id: 'global_settings' },
            {
                ...body,
                updated_at: new Date()
            },
            { new: true, upsert: true }
        );

        revalidatePath('/', 'layout');

        return NextResponse.json({ settings: updatedSettings });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
