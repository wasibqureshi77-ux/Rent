import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Room from '@/models/Room';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    try {
        const room = await Room.findOne({ _id: id, ownerId: session.user.role === 'SUPER_ADMIN' ? undefined : session.user.id });
        if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 });
        return NextResponse.json(room);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching room' }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const body = await req.json();

    try {
        const room = await Room.findOneAndUpdate(
            { _id: id, ownerId: session.user.role === 'SUPER_ADMIN' ? undefined : session.user.id },
            { $set: body },
            { new: true }
        );

        if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 });
        return NextResponse.json(room);
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ message: 'Room number already exists in this property' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error updating room' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    try {
        const room = await Room.findOneAndDelete({
            _id: id,
            ownerId: session.user.role === 'SUPER_ADMIN' ? undefined : session.user.id,
            currentTenantId: null // Prevent deleting occupied rooms
        });

        if (!room) {
            // Check if it exists but is occupied
            const occupiedRoom = await Room.findOne({ _id: id });
            if (occupiedRoom && occupiedRoom.currentTenantId) {
                return NextResponse.json({ message: 'Cannot delete occupied room. Please remove tenant first.' }, { status: 400 });
            }
            return NextResponse.json({ message: 'Room not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Room deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting room' }, { status: 500 });
    }
}
