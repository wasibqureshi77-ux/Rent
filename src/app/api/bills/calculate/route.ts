import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Tenant from '@/models/Tenant';
import MeterReading from '@/models/MeterReading';
import Bill from '@/models/Bill';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');
    const month = url.searchParams.get('month'); // YYYY-MM

    if (!tenantId || !month) {
        return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    try {
        const tenant = await Tenant.findById(tenantId);
        const user = await User.findById(session.user.id);

        // 1. Rent
        const rentAmount = tenant.rentAmount;

        // 2. Water
        const waterCharge = user.settings.fixedWaterBill || 0;

        // 3. Electricity
        // Find reading for this month (e.g. 2023-11)
        const start = new Date(`${month}-01`);
        const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

        // Get the reading recorded in this month (assuming it's the "closing" reading)
        const reading = await MeterReading.findOne({
            tenantId,
            readingDate: { $gte: start, $lt: end }
        }).sort({ readingDate: -1 });

        const electricityUsage = reading ? reading.unitsConsumed : 0;
        const electricityRate = user.settings.electricityRatePerUnit || 0;
        const electricityAmount = electricityUsage * electricityRate;

        // 4. Previous Dues
        // Find previous non-paid bills? 
        // Simplified: Find the bill for previous month and check status?
        // Or just sum of all pending amounts from bills with month < current month.

        const previousBills = await Bill.find({
            tenantId,
            month: { $lt: month },
            status: { $ne: 'paid' }
        });

        const previousDues = previousBills.reduce((acc: number, bill: any) => {
            return acc + (bill.totalAmount - bill.paidAmount);
        }, 0);

        const totalAmount = rentAmount + waterCharge + electricityAmount + previousDues;

        return NextResponse.json({
            rentAmount,
            waterCharge,
            electricityUsage,
            electricityRate,
            electricityAmount,
            previousDues,
            totalAmount
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
