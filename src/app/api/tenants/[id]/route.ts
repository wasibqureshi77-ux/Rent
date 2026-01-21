import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';
import Room from '@/models/Room';


export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id } = await params;

        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const tenant = await Tenant.findOne(query);

        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        // Release the room status before deleting tenant
        if (tenant.roomId) {
            await Room.findByIdAndUpdate(tenant.roomId, {
                $set: { currentTenantId: null }
            });
        }

        await Tenant.deleteOne({ _id: id });

        return NextResponse.json({ message: 'Tenant deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting tenant:', error);
        return NextResponse.json({ message: error.message || 'Error deleting tenant' }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id } = await params;
        const body = await req.json();

        // Prevent updating sensitive fields or ownerId
        delete body.ownerId;
        delete body._id;

        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const tenant = await Tenant.findOneAndUpdate(
            query,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        return NextResponse.json(tenant);
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Error updating tenant' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id } = await params;
        const body = await req.json();

        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const tenant = await Tenant.findOne(query);
        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        if (body.action === 'vacate') {
            // Update tenant status
            tenant.isActive = false;
            tenant.endDate = new Date();
            await tenant.save();

            // Release the room
            if (tenant.roomId) {
                await Room.findByIdAndUpdate(tenant.roomId, {
                    $set: { currentTenantId: null }
                });
            }

            return NextResponse.json({ message: 'Tenant vacated successfully' });
        }

        if (body.action === 'occupy') {
            const { propertyId, roomId, roomNumber, meterReadingStart } = body;

            if (!propertyId || !roomId || !roomNumber) {
                return NextResponse.json({ message: 'Missing property or room info' }, { status: 400 });
            }

            // Check if room is already occupied
            const room = await Room.findById(roomId);
            if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 });
            if (room.currentTenantId && room.currentTenantId.toString() !== tenant._id.toString()) {
                return NextResponse.json({ message: 'Room is already occupied' }, { status: 400 });
            }

            // Update tenant
            tenant.isActive = true;
            tenant.propertyId = propertyId;
            tenant.roomId = roomId;
            tenant.roomNumber = roomNumber;
            // Use provided rent or room's default rent
            tenant.baseRent = Number(body.baseRent) || room.baseRent || tenant.baseRent;
            tenant.meterReadingStart = Number(meterReadingStart) || 0;
            tenant.startDate = new Date();
            tenant.endDate = undefined; // Clear checkout date
            await tenant.save();

            // Update room
            room.currentTenantId = tenant._id;
            if (meterReadingStart !== undefined) {
                room.currentMeterReading = Number(meterReadingStart);
            }
            await room.save();

            return NextResponse.json({ message: 'Tenant re-occupied successfully', tenant });
        }

        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Error in tenant PATCH:', error);
        return NextResponse.json({ message: error.message || 'Error processing request' }, { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const { id } = await params;
        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }
        const tenant = await Tenant.findOne(query)
            .populate('propertyId', 'name')
            .populate('roomId');

        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        return NextResponse.json(tenant);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching tenant' }, { status: 500 });
    }
}
