import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';
import MonthlyBill from '@/models/MonthlyBill';
import Room from '@/models/Room';

// POST /api/tenants - Add a new tenant
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();

        // Validate required fields
        const requiredFields = ['propertyId', 'roomId', 'fullName', 'phoneNumber', 'baseRent', 'startDate'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        // Logic to verify if room is already occupied by ID
        let roomNumber = body.roomNumber;

        if (body.roomId) {
            const room = await Room.findById(body.roomId);
            if (!room) {
                return NextResponse.json({ message: 'Invalid Room ID' }, { status: 400 });
            }
            // Auto-populate roomNumber from the source of truth if missing or strictly enforce it
            roomNumber = room.roomNumber;

            const existingTenant = await Tenant.findOne({
                roomId: body.roomId,
                isActive: true
            });

            if (existingTenant) {
                return NextResponse.json({ message: 'Room is already occupied by another active tenant' }, { status: 400 });
            }
        }

        const tenant = await Tenant.create({
            ownerId: session.user.id,
            propertyId: body.propertyId,
            roomId: body.roomId,
            fullName: body.fullName,
            phoneNumber: body.phoneNumber,
            alternatePhoneNumber: body.alternatePhoneNumber,
            email: body.email,
            roomNumber: roomNumber, // Use resolved roomNumber
            baseRent: body.baseRent,
            meterReadingStart: body.meterReadingStart || 0,
            startDate: body.startDate || new Date(),
            isActive: true
        });

        // Update Room Model to link tenant
        try {
            await Room.findByIdAndUpdate(
                body.roomId,
                { currentTenantId: tenant._id }
            );
        } catch (roomErr) {
            console.error('Failed to update room status:', roomErr);
        }

        // Check for pending bills from previous tenants (optional, maybe not needed for new tenant)
        // But we might want to ensure 'meter' starts fresh or continues?
        // Current logic takes `meterReadingStart` from input.

        return NextResponse.json(tenant, { status: 201 });
    } catch (error: any) {
        console.error('Error creating tenant:', error);
        return NextResponse.json({
            message: error.message || 'Error creating tenant'
        }, { status: 500 });
    }
}


// GET /api/tenants - Get all tenants for the owner
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

        // By default show active tenants, unless 'all' is specified
        if (searchParams.get('active') === 'true') {
            query.isActive = true;
        }

        const tenants = await Tenant.find(query)
            .populate('propertyId', 'name')
            .sort({ createdAt: -1 });

        return NextResponse.json(tenants);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return NextResponse.json({ message: 'Error fetching tenants' }, { status: 500 });
    }
}
