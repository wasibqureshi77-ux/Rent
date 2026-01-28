
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Tenant from '@/models/Tenant';
import MeterReading from '@/models/MeterReading';
import MonthlyBill from '@/models/MonthlyBill';
import Room from '@/models/Room';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');
    const month = url.searchParams.get('month'); // YYYY-MM
    // Query params reading overrides now need to be structured, e.g., readings[roomId]=100
    // But for simplicity in GET, we might just assume initial load or handle complex query params later.
    // For now, let's focus on Returning the base state. The frontend calculation for overrides happens locally mostly or we can ignore overrides for "Calculate" button if we trust frontend math, 
    // BUT the logic "fetchBillDetails" calls this.

    // Simplification: We will support overrides via a JSON string in query param if absolutely needed, 
    // but typically the frontend can just calculate usage.
    // However, to keep it robust:

    if (!tenantId || !month) {
        return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
    }

    try {
        const tenant = await Tenant.findById(tenantId);
        const user = await User.findById(session.user.id);

        if (!tenant) return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

        // Normalize Tenant Rooms (Support both legacy single and new array)
        let tenantRooms = [];
        if (tenant.rooms && tenant.rooms.length > 0) {
            tenantRooms = tenant.rooms;
        } else if (tenant.roomId) {
            // Legacy fallback
            const legacyRoom = await Room.findById(tenant.roomId);
            if (legacyRoom) {
                tenantRooms.push({
                    roomId: tenant.roomId,
                    roomNumber: tenant.roomNumber || legacyRoom.roomNumber,
                    baseRent: tenant.baseRent || legacyRoom.baseRent,
                    meterReadingStart: tenant.meterReadingStart || 0
                });
            }
        }

        // Calculate Rent & Meter for each room
        const roomDetails = [];
        let totalRent = 0;
        let totalElectricityUsage = 0;

        for (const tr of tenantRooms) {
            // Get Room actual data for current meter reading
            const room = await Room.findById(tr.roomId);
            if (!room) continue;

            const previousReading = room.currentMeterReading || tr.meterReadingStart || 0;

            // Try to find the *latest* reading in MeterReadings for current/override
            // or just default to previous
            const latestMeterReading = await MeterReading.findOne({
                tenantId,
                roomId: tr.roomId,
                readingDate: { $gte: tenant.startDate }
            }).sort({ readingDate: -1, createdAt: -1 });

            const currentReading = latestMeterReading ? latestMeterReading.value : previousReading;
            const usage = Math.max(0, currentReading - previousReading);

            totalRent += (tr.baseRent || 0);
            totalElectricityUsage += usage;

            roomDetails.push({
                roomId: tr.roomId,
                roomNumber: tr.roomNumber,
                baseRent: tr.baseRent || 0,
                previousReading,
                currentReading,
                usage
            });
        }

        // Water
        const waterCharge = user.settings?.fixedWaterBill || 0;

        // Electricity
        const electricityRate = user.settings?.electricityRatePerUnit || 0;
        const electricityAmount = totalElectricityUsage * electricityRate;

        // Previous Dues
        const previousMonthlyBills = await MonthlyBill.find({
            tenantId,
            status: { $in: ['PENDING', 'PARTIAL'] }
        });

        const previousDues = previousMonthlyBills.reduce((acc: number, bill: any) => {
            const [bYear, bMonth] = [bill.year, bill.month];
            const [sYear, sMonth] = month.split('-').map(Number);

            // Exclude current month being generated
            if (bYear === sYear && bMonth === sMonth) return acc;

            return acc + (bill.payments?.remainingDue || 0);
        }, 0);

        const totalAmount = totalRent + waterCharge + electricityAmount + previousDues;

        return NextResponse.json({
            rentAmount: totalRent,
            waterCharge,
            electricityRate,
            electricityUsage: totalElectricityUsage,
            electricityAmount,
            previousDues,
            totalAmount,
            roomDetails
            // Legacy top-level fields for safety, though frontend should use roomDetails
            // previousReading: ... 
        });

    } catch (error: any) {
        console.error('Calculate logic error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
