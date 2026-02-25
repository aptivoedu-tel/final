import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AnalyticsTrackingService } from '@/lib/services/analyticsTrackingService';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const user = await User.findOne({ email: session.user.email }).lean() as any;
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const { searchParams } = new URL(request.url);
        const universityId = searchParams.get('university_id') || undefined;

        const { data, error } = await AnalyticsTrackingService.getBehaviorSummary(null, user.id, universityId);
        if (error) return NextResponse.json({ error }, { status: 500 });

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
