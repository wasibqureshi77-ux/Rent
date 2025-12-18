import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MonthlyBill from '@/models/MonthlyBill';
import Tenant from '@/models/Tenant';

// POST /api/bills/:id/payments - Record a payment
export async function POST(
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
        const { amount, method } = body;
        const mode = method || 'Cash';
        const note = '';

        if (!amount || amount <= 0) {
            return NextResponse.json({
                message: 'Invalid payment amount'
            }, { status: 400 });
        }

        // Fetch bill with owner check
        const query: any = { _id: id };
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        const bill = await MonthlyBill.findOne(query);

        if (!bill) {
            return NextResponse.json({
                message: 'Bill not found or access denied'
            }, { status: 404 });
        }

        // Check if bill has required nested objects
        if (!bill.payments || !bill.amounts) {
            return NextResponse.json({
                message: 'Invalid bill structure'
            }, { status: 400 });
        }

        // Validate payment amount doesn't exceed remaining due
        const remainingDue = bill.payments?.remainingDue || 0;
        if (amount > remainingDue) {
            return NextResponse.json({
                message: `Payment amount (${amount}) exceeds remaining due (${remainingDue})`
            }, { status: 400 });
        }

        // Add payment to history
        if (bill.payments) {
            bill.payments.paymentHistory.push({
                paidOn: new Date(),
                amount,
                mode: mode || 'Cash',
                note: note || ''
            });

            // Recalculate payment totals
            bill.payments.amountPaid += amount;
            if (bill.amounts) {
                bill.payments.remainingDue = bill.amounts.totalAmount - bill.payments.amountPaid;
            }

            // Update status
            if (bill.payments.remainingDue === 0) {
                bill.status = 'PAID';
            } else if (bill.payments.amountPaid > 0) {
                bill.status = 'PARTIAL';
            }
        }

        await bill.save();

        // Update tenant outstanding balance
        const tenant = await Tenant.findById(bill.tenantId);
        if (tenant && bill.payments) {
            tenant.outstandingBalance = bill.payments.remainingDue;
            await tenant.save();
        }

        // Populate and return updated bill
        await bill.populate('tenantId', 'fullName roomNumber');
        await bill.populate('propertyId', 'name');

        return NextResponse.json({
            message: 'Payment recorded successfully',
            bill
        });
    } catch (error: any) {
        console.error('Error recording payment:', error);
        return NextResponse.json({
            message: error.message || 'Error recording payment'
        }, { status: 500 });
    }
}
