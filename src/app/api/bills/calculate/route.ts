import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Tenant from '@/models/Tenant';
import MeterReading from '@/models/MeterReading';
import Bill from '@/models/Bill';
import MonthlyBill from '@/models/MonthlyBill';
import Room from '@/models/Room';

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
        const tenant = await Tenant.findById(tenantId).populate('roomId');
        const user = await User.findById(session.user.id);

        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // 1. Rent - Prefer Room's baseRent if available, fallback to Tenant's baseRent
        const rentAmount = (tenant.roomId as any)?.baseRent ?? tenant.baseRent ?? 0;

        // 2. Water
        const waterCharge = user.settings?.fixedWaterBill || 0;

        // Get previous reading (endUnits from the absolute latest bill since tenant start date)
        const lastBill = await MonthlyBill.findOne({
            tenantId,
            createdAt: { $gte: tenant.startDate }
        }).sort({ year: -1, month: -1 });

        const previousReading = lastBill ? (lastBill.meter?.endUnits || 0) : (tenant.meterReadingStart || 0);

        // Get Current Reading (Latest value from MeterReading collection since tenant start date)
        const latestMeterReading = await MeterReading.findOne({
            tenantId,
            readingDate: { $gte: tenant.startDate }
        }).sort({ readingDate: -1, createdAt: -1 });

        const currentReading = latestMeterReading ? latestMeterReading.value : previousReading;

        // Check if user provided reading/usage in query params for calculation
        const manualUsage = url.searchParams.get('usage');
        const manualCurrentReading = url.searchParams.get('currentReading');

        let electricityUsage = 0;
        let finalCurrentReading = currentReading;

        if (manualUsage) {
            electricityUsage = parseFloat(manualUsage);
        } else if (manualCurrentReading) {
            finalCurrentReading = parseFloat(manualCurrentReading);
            electricityUsage = Math.max(0, finalCurrentReading - previousReading);
        } else {
            // Default usage based on latest known reading
            electricityUsage = Math.max(0, currentReading - previousReading);
        }

        const electricityRate = user.settings?.electricityRatePerUnit || 0;
        const electricityAmount = electricityUsage * electricityRate;

        // 4. Previous Dues
        const previousMonthlyBills = await MonthlyBill.find({
            tenantId,
            status: { $in: ['PENDING', 'PARTIAL'] }
        });

        const previousDues = previousMonthlyBills.reduce((acc: number, bill: any) => {
            const [bYear, bMonth] = [bill.year, bill.month];
            const [sYear, sMonth] = month.split('-').map(Number);

            // Exclude the month we are currently generating for (if it already exists or matches)
            if (bYear === sYear && bMonth === sMonth) return acc;

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
            previousReading,
            currentReading: finalCurrentReading
        });

    } catch (error: any) {
        console.error('Calculate logic error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
