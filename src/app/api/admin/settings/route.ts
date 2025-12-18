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
    return NextResponse.json(settings || { monthlyPlatformFee: 0 });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'super_admin' && session.user.role !== 'SUPER_ADMIN')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const settings = await SystemSetting.findOneAndUpdate(
        { key: 'global_config' },
        { monthlyPlatformFee: body.monthlyPlatformFee },
        { upsert: true, new: true }
    );

    return NextResponse.json(settings);
}
