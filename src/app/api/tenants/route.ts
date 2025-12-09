import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const { searchParams } = new URL(req.url);
        const propertyId = searchParams.get('propertyId');

        const query: any = session.user.role === 'SUPER_ADMIN'
            ? {}
            : { ownerId: session.user.id };

        if (propertyId) {
            query.propertyId = propertyId;
        }

        const tenants = await Tenant.find(query)
            .populate('propertyId', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json(tenants);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return NextResponse.json({
            message: 'Error fetching tenants'
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { propertyId, fullName, roomNumber, phoneNumber, alternatePhoneNumber, email, baseRent, startDate, meterReadingStart } = body;

        // Validate required fields
        if (!propertyId || !fullName || !roomNumber || !phoneNumber || !baseRent) {
            return NextResponse.json({
                message: 'Missing required fields'
            }, { status: 400 });
        }

        const tenant = await Tenant.create({
            ownerId: session.user.id,
            propertyId,
            fullName,
            roomNumber,
            phoneNumber,
            alternatePhoneNumber,
            email,
            baseRent,
            startDate: startDate || new Date(),
            isActive: true,
            outstandingBalance: 0,
            meterReadingStart: meterReadingStart || 0
        });

        return NextResponse.json(tenant, { status: 201 });
    } catch (error: any) {
        console.error('Error creating tenant:', error);
        return NextResponse.json({
            message: error.message || 'Error creating tenant'
        }, { status: 500 });
    }
}
