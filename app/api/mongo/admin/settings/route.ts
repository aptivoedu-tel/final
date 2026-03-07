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

        console.log('[API/Settings] GET global_settings...');
        let settings = await SystemSettings.findOne({ setting_id: 'global_settings' }).lean();

        if (!settings) {
            console.log('[API/Settings] No global record detected. Seeding...');
            const newDoc = await SystemSettings.create({
                setting_id: 'global_settings',
                practice_mcqs_limit: 20,
                ai_chatbot_active: true,
                updated_at: new Date()
            });
            settings = newDoc.toObject ? newDoc.toObject() : newDoc;
        }

        // Integrity check — prune orphans if mongo somehow duplicated unique index record
        const totalDocs = await SystemSettings.countDocuments({});
        if (totalDocs > 1) {
            console.warn(`[API/Settings] Redundant records (${totalDocs}) detected. Purging orphans...`);
            await SystemSettings.deleteMany({ setting_id: { $ne: 'global_settings' } });
        }

        console.log('[API/Settings] Delivering current limit:', settings.practice_mcqs_limit);

        return NextResponse.json({ settings }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error: any) {
        console.error('[API/Settings] GET Internal Error:', error);
        return NextResponse.json({
            error: error.message || 'Settings retrieval failed',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
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

        console.log('[API/Settings] PATCH Sync request body:', JSON.stringify(body));

        // Targeted upsert ensuring setting_id is preserved
        const updateData: any = {
            updated_at: new Date(),
            setting_id: 'global_settings'
        };

        if (body.practice_mcqs_limit !== undefined) {
            updateData.practice_mcqs_limit = Number(body.practice_mcqs_limit);
        }
        if (body.ai_chatbot_active !== undefined) {
            updateData.ai_chatbot_active = !!body.ai_chatbot_active;
        }
        if (body.maintenance_mode !== undefined) {
            updateData.maintenance_mode = !!body.maintenance_mode;
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
        ).lean();

        console.log('[API/Settings] Sync completed successfully. DB Value:', updatedSettings.practice_mcqs_limit);

        revalidatePath('/', 'layout');
        revalidatePath('/admin/question-bank');
        revalidatePath('/practice');

        return NextResponse.json({ settings: updatedSettings }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error: any) {
        console.error('[API/Settings] PATCH Sync Failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
