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

    // Logic: If user is tenant or super admin, skip
    if (user.role === 'SUPER_ADMIN') {
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

    // 1. Check if manually marked as OVERDUE
    if (user.status === 'OVERDUE' || user.subscription?.status === 'OVERDUE') {
        isOverdue = true;
    }

    // 2. Check if expired based on date
    const now = new Date();
    const nextBillingDate = user.subscription?.nextBillingDate;

    if (nextBillingDate) {
        if (new Date(nextBillingDate) < now) {
            isOverdue = true;
        }
    } else {
        // FALLBACK: If missing date (old users), assume 30 days from creation
        const trialEndDate = new Date(user.createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 30);

        if (trialEndDate < now) {
            isOverdue = true;
            // Also update the database so we have a date now
            await User.findByIdAndUpdate(user._id, {
                'subscription.nextBillingDate': trialEndDate,
                'subscription.status': 'OVERDUE'
            });
        }
    }

    let razorpayKeyId = '';

    const settings = await SystemSetting.findOne({ key: 'global_config' });
    console.log('[DEBUG] Subscription Status Check:', {
        email: user.email,
        isOverdue,
        fee,
        dbKeyId: settings?.razorpayKeyId ? 'EXISTS' : 'EMPTY',
        globalFee: settings?.monthlyPlatformFee
    });

    if (isOverdue) {
        // Fetch fee (use user's specific plan amount if set, else global)
        fee = user.subscription?.planAmount || 0;

        if (fee === 0) {
            fee = settings?.monthlyPlatformFee || 500; // Fallback to 500 if nothing set
        }
        razorpayKeyId = settings?.razorpayKeyId || '';
    }

    return NextResponse.json({
        isOverdue,
        fee,
        razorpayKeyId: settings?.razorpayKeyId || ''
    });
}
