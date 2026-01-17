import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import SystemSetting from '@/models/SystemSetting';
import User from '@/models/User';
import crypto from 'crypto';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();

    try {
        const body = await req.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            amount
        } = body;

        const settings = await SystemSetting.findOne({ key: 'global_config' });
        if (!settings?.razorpayKeySecret) {
            return NextResponse.json({ message: 'Razorpay is not configured' }, { status: 500 });
        }

        // Verify signature
        const text = razorpay_order_id + "|" + razorpay_payment_id;
        const generated_signature = crypto
            .createHmac("sha256", settings.razorpayKeySecret)
            .update(text)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ message: 'Invalid payment signature' }, { status: 400 });
        }

        // Update user subscription
        const user = await User.findById(session.user.id);
        if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

        // Calculate next billing date (add 30 days or 1 month)
        const currentNextBilling = user.subscription?.nextBillingDate ? new Date(user.subscription.nextBillingDate) : new Date();
        const newNextBilling = new Date(Math.max(currentNextBilling.getTime(), Date.now()));
        newNextBilling.setMonth(newNextBilling.getMonth() + 1);

        await User.findByIdAndUpdate(user._id, {
            status: 'ACTIVE',
            'subscription.status': 'ACTIVE',
            'subscription.nextBillingDate': newNextBilling,
            'subscription.lastPaymentDate': new Date(),
            'subscription.planAmount': amount
        });

        return NextResponse.json({ success: true, message: 'Payment verified and subscription updated' });
    } catch (error: any) {
        console.error('Payment verification failed:', error);
        return NextResponse.json({ message: error.message || 'Verification failed' }, { status: 500 });
    }
}
