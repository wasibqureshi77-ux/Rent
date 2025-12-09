import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';

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
        const tenant = await Tenant.findOneAndDelete({
            _id: id,
            ownerId: session.user.id
        });

        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Tenant deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting tenant' }, { status: 500 });
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

        const tenant = await Tenant.findOneAndUpdate(
            { _id: id, ownerId: session.user.id },
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
        const tenant = await Tenant.findOne({
            _id: id,
            ownerId: session.user.id
        });

        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        return NextResponse.json(tenant);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching tenant' }, { status: 500 });
    }
}
