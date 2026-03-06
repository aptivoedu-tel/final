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

        // 1. Fetch exactly the global record
        let settings = await SystemSettings.findOne({ setting_id: 'global_settings' });

        // 2. If it doesn't exist, create it once
        if (!settings) {
            console.log('[PlatformSettings] No global record detected. Seeding...');
            settings = await SystemSettings.create({
                setting_id: 'global_settings',
                practice_mcqs_limit: 20,
                ai_chatbot_active: true,
                updated_at: new Date()
            });
        }

        // 3. Optional: Background cleanup for orphaned docs (without id being global_settings)
        // Only run if we actually have extra docs
        const totalDocs = await SystemSettings.countDocuments({});
        if (totalDocs > 1) {
            console.warn(`[PlatformSettings] Redundant records (${totalDocs}) detected. Purging orphans...`);
            await SystemSettings.deleteMany({ setting_id: { $ne: 'global_settings' } });
        }

        console.log('[PlatformSettings] Delivering current limit:', settings.practice_mcqs_limit);

        return new NextResponse(JSON.stringify({ settings }), {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Content-Type': 'application/json',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error: any) {
        console.error('[PlatformSettings] Retrieve Failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized configuration change' }, { status: 401 });
        }

        const body = await req.json();
        await connectToDatabase();

        console.log('[PlatformSettings] Attempting sync with body:', body);

        // Targeted upsert ensuring setting_id is preserved
        const updateData: any = {
            updated_at: new Date(),
            setting_id: 'global_settings' // Explicitly set even on update to be safe
        };

        if (body.practice_mcqs_limit !== undefined) {
            updateData.practice_mcqs_limit = Number(body.practice_mcqs_limit);
        }
        if (body.ai_chatbot_active !== undefined) {
            updateData.ai_chatbot_active = !!body.ai_chatbot_active;
        }

        const updatedSettings = await SystemSettings.findOneAndUpdate(
            { setting_id: 'global_settings' },
            { $set: updateData },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true
            }
        );

        console.log('[PlatformSettings] Sync completed successfully. DB Value:', updatedSettings.practice_mcqs_limit);

        revalidatePath('/', 'layout');
        revalidatePath('/admin/question-bank');

        return new NextResponse(JSON.stringify({ settings: updatedSettings }), {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Content-Type': 'application/json',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error: any) {
        console.error('[PlatformSettings] Sync Failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
