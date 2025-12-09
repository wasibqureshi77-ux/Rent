import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Tenant from '@/models/Tenant';
import MeterReading from '@/models/MeterReading';
import Bill from '@/models/Bill';
import MonthlyBill from '@/models/MonthlyBill';

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

        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // 1. Rent
        const rentAmount = tenant.baseRent || 0;

        // 2. Water
        const waterCharge = user.settings?.fixedWaterBill || 0;

        // 3. Electricity & Previous Reading
        // Get previous reading (start units for current calculation)
        const lastBill = await MonthlyBill.findOne({
            tenantId,
        }).sort({ year: -1, month: -1 });

        const previousReading = lastBill ? (lastBill.meter?.endUnits || 0) : (tenant.meterReadingStart || 0);

        // Check if user provided reading/usage in query params for calculation
        const manualUsage = url.searchParams.get('usage');

        let electricityUsage = 0;

        if (manualUsage) {
            electricityUsage = parseFloat(manualUsage);
        } else {
            // Fallback to searching database for existing reading
            const start = new Date(`${month}-01`);
            const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
            const reading = await MeterReading.findOne({
                tenantId,
                readingDate: { $gte: start, $lt: end }
            }).sort({ readingDate: -1 });
            electricityUsage = reading ? reading.unitsConsumed : 0;
        }

        const electricityRate = user.settings?.electricityRatePerUnit || 0;
        const electricityAmount = electricityUsage * electricityRate;

        // 4. Previous Dues
        // We probably should check MonthlyBill for dues as well if we are transitioning?
        // For now, let's look at MonthlyBill too, or stick to Bill if that's the legacy.
        // Assuming MonthlyBill is the new standard:
        const previousMonthlyBills = await MonthlyBill.find({
            tenantId,
            status: { $in: ['PENDING', 'PARTIAL'] }
        });

        const previousDues = previousMonthlyBills.reduce((acc: number, bill: any) => {
            // Avoid adding current month's bill if it exists? 
            // The query filter for 'month' isn't here, but if we are creating a new one...
            // Let's exclude current month.
            if (bill.month === parseInt(month.split('-')[1]) && bill.year === parseInt(month.split('-')[0])) return acc;
            return acc + (bill.payments?.remainingDue || 0);
        }, 0);

        const totalAmount = rentAmount + waterCharge + electricityAmount + previousDues;

        return NextResponse.json({
            rentAmount,
            waterCharge,
            electricityUsage,
            electricityRate,
            electricityAmount,
            previousDues,
            totalAmount,
            previousReading
        });

    } catch (error: any) {
        console.error('Calculate logic error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
