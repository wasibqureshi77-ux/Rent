import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Property from '@/models/Property';

// GET /api/properties - Get all properties for the logged-in owner
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const query = session.user.role === 'SUPER_ADMIN'
            ? {}
            : { ownerId: session.user.id };

        const properties = await Property.find(query)
            .sort({ createdAt: -1 });

        return NextResponse.json(properties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        return NextResponse.json({
            message: 'Error fetching properties'
        }, { status: 500 });
    }
}

// POST /api/properties - Create a new property
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { name, address, city, state } = body;

        if (!name) {
            return NextResponse.json({
                message: 'Property name is required'
            }, { status: 400 });
        }

        const property = await Property.create({
            ownerId: session.user.id,
            name,
            address,
            city,
            state,
            isActive: true
        });

        return NextResponse.json(property, { status: 201 });
    } catch (error: any) {
        console.error('Error creating property:', error);
        return NextResponse.json({
            message: error.message || 'Error creating property'
        }, { status: 500 });
    }
}
