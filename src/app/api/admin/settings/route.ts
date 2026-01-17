import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import SystemSetting from '@/models/SystemSetting';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'super_admin' && session.user.role !== 'SUPER_ADMIN')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const settings = await SystemSetting.findOne({ key: 'global_config' });
    console.log('[DEBUG] Admin Settings Fetched:', settings);
    return NextResponse.json(settings || { monthlyPlatformFee: 0, razorpayKeyId: '', razorpayKeySecret: '' });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'super_admin' && session.user.role !== 'SUPER_ADMIN')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[DEBUG] Saving Admin Settings - Incoming:', {
        monthlyPlatformFee: body.monthlyPlatformFee,
        razorpayKeyId: body.razorpayKeyId ? 'EXISTS(HIDDEN)' : 'EMPTY',
        razorpayKeySecret: body.razorpayKeySecret ? 'EXISTS(HIDDEN)' : 'EMPTY'
    });
    await connectDB();

    const settings = await SystemSetting.findOneAndUpdate(
        { key: 'global_config' },
        {
            monthlyPlatformFee: body.monthlyPlatformFee,
            razorpayKeyId: body.razorpayKeyId,
            razorpayKeySecret: body.razorpayKeySecret
        },
        { upsert: true, new: true }
    );

    return NextResponse.json(settings);
}
