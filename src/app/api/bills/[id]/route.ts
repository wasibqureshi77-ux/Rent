import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MonthlyBill from '@/models/MonthlyBill';

// GET /api/bills/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectDB();

    try {
        const bill = await MonthlyBill.findOne({
            _id: id,
            ownerId: session.user.role === 'SUPER_ADMIN' ? undefined : session.user.id
        }).populate('tenantId').populate('propertyId');

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
        const bill = await MonthlyBill.findOneAndDelete({
            _id: id,
            ownerId: session.user.role === 'SUPER_ADMIN' ? undefined : session.user.id
        });

        if (!bill) {
            return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting bill' }, { status: 500 });
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

        const bill = await MonthlyBill.findOneAndUpdate(
            {
                _id: id,
                ownerId: session.user.role === 'SUPER_ADMIN' ? undefined : session.user.id
            },
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
