import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Settings from '@/models/Settings';

// GET /api/owner-settings - Get settings for the logged-in owner
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        let settings = await Settings.findOne({ ownerId: session.user.id });

        // Create default settings if they don't exist
        if (!settings) {
            settings = await Settings.create({
                ownerId: session.user.id,
                ownerEmail: session.user.email || '',
                defaultWaterCharge: 0,
                defaultRatePerUnit: 0,
                currency: 'INR'
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({
            message: 'Error fetching settings'
        }, { status: 500 });
    }
}

// PUT /api/owner-settings - Update settings
export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { defaultWaterCharge, defaultRatePerUnit, ownerEmail, currency } = body;

        const updates: any = {};
        if (defaultWaterCharge !== undefined) updates.defaultWaterCharge = defaultWaterCharge;
        if (defaultRatePerUnit !== undefined) updates.defaultRatePerUnit = defaultRatePerUnit;
        if (ownerEmail !== undefined) updates.ownerEmail = ownerEmail;
        if (currency !== undefined) updates.currency = currency;

        const settings = await Settings.findOneAndUpdate(
            { ownerId: session.user.id },
            { $set: updates },
            { new: true, upsert: true, runValidators: true }
        );

        return NextResponse.json(settings);
    } catch (error: any) {
        console.error('Error updating settings:', error);
        return NextResponse.json({
            message: error.message || 'Error updating settings'
        }, { status: 500 });
    }
}
