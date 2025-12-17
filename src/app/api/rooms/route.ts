import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Room from '@/models/Room';
import Tenant from '@/models/Tenant';

// GET /api/rooms?propertyId=...
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    const query: any = { ownerId: session.user.role === 'SUPER_ADMIN' ? undefined : session.user.id };
    if (propertyId) query.propertyId = propertyId;

    try {
        const rooms = await Room.find(query)
            .populate('propertyId', 'name')
            .populate('currentTenantId', 'fullName')
            .sort({ floorNumber: 1, roomNumber: 1 });

        return NextResponse.json(rooms);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching rooms' }, { status: 500 });
    }
}

// POST /api/rooms
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { propertyId, floorNumber, roomNumber, type } = body;

    if (!propertyId || !floorNumber || !roomNumber) {
        return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    try {
        const room = await Room.create({
            ownerId: session.user.id,
            propertyId,
            floorNumber,
            roomNumber,
            type: type || 'ROOM',
            currentMeterReading: body.currentMeterReading || 0,
            currentKitchenMeterReading: body.currentKitchenMeterReading || 0
        });

        // Check if there's already an active tenant for this room (backfill/sync)
        const existingTenant = await Tenant.findOne({
            propertyId,
            roomNumber,
            isActive: true
        });

        if (existingTenant) {
            room.currentTenantId = existingTenant._id;
            await room.save();
        }

        return NextResponse.json(room, { status: 201 });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ message: 'Room number already exists in this property' }, { status: 400 });
        }
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
