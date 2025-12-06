import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Bill from '@/models/Bill';
import Tenant from '@/models/Tenant'; // Ensure model is loaded

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();

    try {
        const bills = await Bill.find({ ownerId: session.user.id })
            .populate('tenantId', 'name roomNo')
            .sort({ month: -1, createdAt: -1 });

        return NextResponse.json(bills);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching bills' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();

    try {
        const body = await req.json();

        // Check if bill already exists for this tenant and month?
        // Mongoose index handles unique { tenantId, month }

        const bill = await Bill.create({
            ...body,
            ownerId: session.user.id
        });

        return NextResponse.json(bill, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
