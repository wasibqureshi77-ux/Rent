import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';
import '@/models/Property';
import MonthlyBill from '@/models/MonthlyBill';
import Room from '@/models/Room';

// POST /api/tenants - Add a new tenant
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();

        // Validate required fields
        const requiredFields = ['propertyId', 'roomId', 'fullName', 'phoneNumber', 'baseRent', 'startDate'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        // Logic to verify if room is already occupied by ID
        let roomNumber = body.roomNumber;

        if (body.roomId) {
            const room = await Room.findById(body.roomId);
            if (!room) {
                return NextResponse.json({ message: 'Invalid Room ID' }, { status: 400 });
            }
            // Auto-populate roomNumber from the source of truth if missing or strictly enforce it
            roomNumber = room.roomNumber;

            const existingTenant = await Tenant.findOne({
                roomId: body.roomId,
                isActive: true
            });

            if (existingTenant) {
                return NextResponse.json({ message: 'Room is already occupied by another active tenant' }, { status: 400 });
            }
        }

        const tenant = await Tenant.create({
            ownerId: session.user.id,
            propertyId: body.propertyId,
            roomId: body.roomId,
            fullName: body.fullName,
            phoneNumber: body.phoneNumber,
            alternatePhoneNumber: body.alternatePhoneNumber,
            email: body.email,
            roomNumber: roomNumber, // Use resolved roomNumber
            baseRent: body.baseRent,
            meterReadingStart: body.meterReadingStart || 0,
            startDate: body.startDate || new Date(),
            isActive: true
        });

        // Update Room Model to link tenant
        try {
            await Room.findByIdAndUpdate(
                body.roomId,
                { currentTenantId: tenant._id }
            );
        } catch (roomErr) {
            console.error('Failed to update room status:', roomErr);
        }

        // Check for pending bills from previous tenants (optional, maybe not needed for new tenant)
        // But we might want to ensure 'meter' starts fresh or continues?
        // Current logic takes `meterReadingStart` from input.

        return NextResponse.json(tenant, { status: 201 });
    } catch (error: any) {
        console.error('Error creating tenant:', error);
        return NextResponse.json({
            message: error.message || 'Error creating tenant'
        }, { status: 500 });
    }
}


// GET /api/tenants - Get all tenants for the owner
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const { searchParams } = new URL(req.url);
        const propertyId = searchParams.get('propertyId');

        const query: any = session.user.role === 'SUPER_ADMIN'
            ? {}
            : { ownerId: session.user.id };

        if (propertyId) {
            query.propertyId = propertyId;
        }

        // By default show active tenants, unless 'all' is specified
        if (searchParams.get('active') === 'true') {
            query.isActive = true;
        }

        const tenants = await Tenant.find(query)
            .populate('propertyId', 'name')
            .sort({ createdAt: -1 });

        // Enhance tenants with dynamic stats
        const enhancedTenants = await Promise.all(tenants.map(async (tenant) => {
            // 1. Get Latest Bill for Meter Reading
            const latestBill = await MonthlyBill.findOne({ tenantId: tenant._id })
                .sort({ year: -1, month: -1 });

            const lastMeterReading = latestBill?.meter?.endUnits ?? tenant.meterReadingStart;

            // 2. Calculate Total Due
            // Sum of (total - paid) for all bills that are not fully paid
            const unpaidBills = await MonthlyBill.find({
                tenantId: tenant._id,
                status: { $in: ['PENDING', 'PARTIAL'] }
            });

            const totalDue = unpaidBills.reduce((sum: number, bill: any) => {
                const total = bill.amounts?.totalAmount || 0;
                const paid = bill.amounts?.paidAmount || 0;
                // If bill is PARTIAL/PENDING, add remaining
                return sum + (total - paid);
            }, 0);

            // 3. Calculate Current Month Completion Date
            // If started on 5th, cycle ends on 4th of next month relative to today
            let cycleEndDate: Date | null = null;
            if (tenant.startDate) {
                const today = new Date();
                const startDay = new Date(tenant.startDate).getDate();

                // Construct a date in the current month with the start day
                const currentMonthCycleStart = new Date(today.getFullYear(), today.getMonth(), startDay);

                // If today is after the start day (e.g., today 18th, start 5th), the cycle ends next month
                // If today is before (e.g., today 2nd, start 5th), current cycle ends this month
                // Actually, typically "Completion Date" means the end of the *current active* rental month.

                let targetMonth = today.getMonth();
                if (today.getDate() >= startDay) {
                    targetMonth = today.getMonth() + 1;
                }

                // The end date is "Start Day - 1" of the target month
                // But simplified: If cycle starts on 5th, it ends on 4th.
                // We create date for Start Day of Target Month, then subtract 1 day.
                const nextCycleStart = new Date(today.getFullYear(), targetMonth, startDay);
                cycleEndDate = new Date(nextCycleStart);
                cycleEndDate.setDate(cycleEndDate.getDate() - 1);
            }

            return {
                ...tenant.toObject(),
                stats: {
                    lastMeterReading,
                    totalDue,
                    cycleEndDate
                }
            };
        }));

        return NextResponse.json(enhancedTenants);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        return NextResponse.json({ message: 'Error fetching tenants' }, { status: 500 });
    }
}
