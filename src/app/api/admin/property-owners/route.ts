import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { sendApprovalNotificationEmail } from '@/lib/email';

// GET /api/admin/property-owners?status=PENDING_APPROVAL
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        const query: any = { role: 'PROPERTY_OWNER' };
        if (status) {
            query.status = status;
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 });

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching property owners' }, { status: 500 });
    }
}
