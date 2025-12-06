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
        const tenants = await Tenant.find({ ownerId: session.user.id }).sort({ createdAt: -1 });
        return NextResponse.json(tenants);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching tenants' }, { status: 500 });
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
        const tenant = await Tenant.create({
            ...body,
            ownerId: session.user.id
        });
        return NextResponse.json(tenant, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Error creating tenant' }, { status: 500 });
    }
}
