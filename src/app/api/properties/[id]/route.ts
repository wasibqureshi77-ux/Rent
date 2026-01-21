import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Property from '@/models/Property';
import Room from '@/models/Room';
import Tenant from '@/models/Tenant';


// GET /api/properties/:id
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

        const property = await Property.findOne(query);

        if (!property) {
            return NextResponse.json({
                message: 'Property not found'
            }, { status: 404 });
        }

        return NextResponse.json(property);
    } catch (error) {
        console.error('Error fetching property:', error);
        return NextResponse.json({
            message: 'Error fetching property'
        }, { status: 500 });
    }
}

// PUT /api/properties/:id
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

        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const allowedUpdates = ['name', 'address', 'city', 'state', 'isActive'];
        const updates: any = {};

        for (const key of allowedUpdates) {
            if (body[key] !== undefined) {
                updates[key] = body[key];
            }
        }

        const property = await Property.findOneAndUpdate(
            query,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!property) {
            return NextResponse.json({
                message: 'Property not found'
            }, { status: 404 });
        }

        return NextResponse.json(property);
    } catch (error: any) {
        console.error('Error updating property:', error);
        return NextResponse.json({
            message: error.message || 'Error updating property'
        }, { status: 500 });
    }
}

// DELETE /api/properties/:id
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

        // Check if property exists first
        const property = await Property.findOne(query);

        if (!property) {
            return NextResponse.json({
                message: 'Property not found'
            }, { status: 404 });
        }

        // Check if there are any tenants in this property
        const tenantCount = await Tenant.countDocuments({ propertyId: id });
        if (tenantCount > 0) {
            return NextResponse.json({
                message: "We can't delete this property because rooms and tenants exist in this property. Please remove all tenants first."
            }, { status: 400 });
        }

        // Delete all rooms associated with this property
        await Room.deleteMany({ propertyId: id });

        // Delete the property
        await Property.findByIdAndDelete(id);

        return NextResponse.json({
            message: 'Property and its rooms deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting property:', error);
        return NextResponse.json({
            message: 'Error deleting property'
        }, { status: 500 });
    }
}
