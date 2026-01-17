import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import SystemSetting from '@/models/SystemSetting';
import User from '@/models/User';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();

    try {
        const body = await req.json();
        const { amount } = body;

        const settings = await SystemSetting.findOne({ key: 'global_config' });
        console.log('[DEBUG] Razorpay Order Creation - Settings Found:', {
            hasKeyId: !!settings?.razorpayKeyId,
            hasSecret: !!settings?.razorpayKeySecret,
            keyIdStart: settings?.razorpayKeyId?.substring(0, 8)
        });

        if (!settings?.razorpayKeyId || !settings?.razorpayKeySecret) {
            return NextResponse.json({ message: 'Razorpay is not configured' }, { status: 500 });
        }

        const instance = new Razorpay({
            key_id: settings.razorpayKeyId,
            key_secret: settings.razorpayKeySecret,
        });

        const options = {
            amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
            currency: "INR",
            receipt: `order_rcptid_${Date.now()}`,
        };

        const order = await instance.orders.create(options);

        return NextResponse.json(order);
    } catch (error: any) {
        console.error('Razorpay order creation failed:', error);
        return NextResponse.json({ message: error.message || 'Failed to create order' }, { status: 500 });
    }
}
