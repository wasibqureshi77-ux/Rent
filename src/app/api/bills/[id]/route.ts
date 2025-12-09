import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MonthlyBill from '@/models/MonthlyBill';

export async function GET(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectDB();
        const bill = await MonthlyBill.findById(params.id)
            .populate('tenantId', 'fullName roomNumber baseRent')
            .populate('propertyId', 'name address'); // Assuming Property model has address

        if (!bill) {
            return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
        }

        return NextResponse.json(bill);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching bill' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Optional: Add logic to restrict deletion to Owner/Admin

    try {
        await connectDB();
        const deletedBill = await MonthlyBill.findByIdAndDelete(params.id);

        if (!deletedBill) {
            return NextResponse.json({ message: 'Bill not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting bill' }, { status: 500 });
    }
}
