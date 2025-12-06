import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const user = await User.findById(session.user.id).select('settings');
        return NextResponse.json(user?.settings || {});
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching settings' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { fixedWaterBill, electricityRatePerUnit, currency } = body;

        const user = await User.findByIdAndUpdate(
            session.user.id,
            {
                $set: {
                    'settings.fixedWaterBill': fixedWaterBill,
                    'settings.electricityRatePerUnit': electricityRatePerUnit,
                    'settings.currency': currency
                }
            },
            { new: true }
        ).select('settings');

        return NextResponse.json(user?.settings);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating settings' }, { status: 500 });
    }
}
