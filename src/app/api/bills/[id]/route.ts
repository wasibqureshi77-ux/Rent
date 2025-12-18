import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MonthlyBill from '@/models/MonthlyBill';
import '@/models/Tenant';
import '@/models/Property';

// GET /api/bills/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    try {
        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const bill = await MonthlyBill.findOne(query)
            .populate('tenantId')
            .populate('propertyId');

        if (!bill) {
            return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
        }

        return NextResponse.json(bill);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching bill' }, { status: 500 });
    }
}

// DELETE /api/bills/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    try {
        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        console.log(`Attempting to delete bill ${id} with query:`, query);
        const bill = await MonthlyBill.findOneAndDelete(query);

        if (!bill) {
            console.log(`Bill ${id} not found or access denied for deletion.`);
            return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
        }

        console.log(`Bill ${id} deleted successfully.`);
        return NextResponse.json({ message: 'Bill deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting bill:', error);
        return NextResponse.json({ message: 'Error deleting bill: ' + error.message }, { status: 500 });
    }
}

// PATCH /api/bills/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    try {
        const body = await req.json();
        const { status } = body;

        if (!['PENDING', 'PARTIAL', 'PAID'].includes(status)) {
            return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
        }

        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const bill = await MonthlyBill.findOneAndUpdate(
            query,
            { status },
            { new: true }
        );

        if (!bill) {
            return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
        }

        return NextResponse.json(bill);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating bill' }, { status: 500 });
    }
}
