import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import SystemSetting from '@/models/SystemSetting';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.user.id);

    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    // Logic: If user is tenant or super admin, skip?
    // Assume tenants don't pay platform fee, only owners (PROPERTY_OWNER)
    if (user.role === 'SUPER_ADMIN' || user.role === 'super_admin') {
        return NextResponse.json({ isOverdue: false });
    }

    const today = new Date();
    // Check if overdue
    // If nextBillingDate is present and in the past
    // AND subscription status is not 'INACTIVE' (if inactive, they might be blocked entirely or just "not subscribed")
    // Wait, user said "pop up . . . pay monthly charge"
    // If isApproved is false, they already can't access much (handled by layout/middleware usually, or just empty UI).
    // Let's assume if isApproved is TRUE, but Date is passed, show popup.

    let isOverdue = false;
    let fee = 0;

    if (user.subscription?.nextBillingDate) {
        if (new Date(user.subscription.nextBillingDate) < today) {
            isOverdue = true;

            // Fetch global fee
            const settings = await SystemSetting.findOne({ key: 'global_config' });
            fee = settings?.monthlyPlatformFee || 0;
        }
    }

    return NextResponse.json({ isOverdue, fee });
}
