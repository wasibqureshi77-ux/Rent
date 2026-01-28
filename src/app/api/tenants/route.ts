import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Tenant from '@/models/Tenant';
import MeterReading from '@/models/MeterReading';
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
        const requiredFields = ['propertyId', 'fullName', 'phoneNumber', 'rooms', 'startDate'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        if (!Array.isArray(body.rooms) || body.rooms.length === 0) {
            return NextResponse.json({ message: 'At least one room must be assigned' }, { status: 400 });
        }

        // Verify all rooms availability
        const roomIds = body.rooms.map((r: any) => r.roomId);

        // Check for existing tenants in ANY of these rooms
        const existingTenants = await Tenant.find({
            'rooms.roomId': { $in: roomIds },
            isActive: true
        });

        // Also check legacy single-room tenants
        const legacyTenants = await Tenant.find({
            roomId: { $in: roomIds },
            isActive: true
        });

        if (existingTenants.length > 0 || legacyTenants.length > 0) {
            return NextResponse.json({ message: 'One or more rooms are already occupied' }, { status: 400 });
        }

        // Create Tenant
        // For backward compatibility, we can populate the "primary" room fields with the first room
        const primaryRoom = body.rooms[0];

        const tenant = await Tenant.create({
            ownerId: session.user.id,
            propertyId: body.propertyId,
            rooms: body.rooms.map((r: any) => ({
                roomId: r.roomId,
                roomNumber: r.roomNumber,
                baseRent: Number(r.baseRent),
                meterReadingStart: Number(r.meterReadingStart) || 0
            })),
            // Legacy / Primary fields
            roomId: primaryRoom.roomId,
            roomNumber: primaryRoom.roomNumber,
            baseRent: Number(primaryRoom.baseRent),
            meterReadingStart: Number(primaryRoom.meterReadingStart) || 0,

            fullName: body.fullName,
            phoneNumber: body.phoneNumber,
            alternatePhoneNumber: body.alternatePhoneNumber,
            email: body.email,
            startDate: body.startDate || new Date(),
            isActive: true
        });

        // Update All Rooms to link tenant
        try {
            await Room.updateMany(
                { _id: { $in: roomIds } },
                { $set: { currentTenantId: tenant._id } }
            );
        } catch (roomErr) {
            console.error('Failed to update rooms status:', roomErr);
        }

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
            .populate('roomId')
            .sort({ createdAt: -1 });

        // Enhance tenants with dynamic stats
        const enhancedTenants = await Promise.all(tenants.map(async (tenant) => {
            // 1. Get Latest Reading from MeterReading collection (most accurate/recent since start date)
            // 1. Get Latest Readings for each room
            // We need to return an object or array that maps Room Number -> Last Reading
            let lastMeterReadings: any[] = [];

            if (tenant.rooms && tenant.rooms.length > 0) {
                // Iterate over rooms to find their specific last reading
                lastMeterReadings = await Promise.all(tenant.rooms.map(async (room: any) => {
                    // Check DB for readings for this specific room
                    const reading = await MeterReading.findOne({
                        tenantId: tenant._id,
                        roomId: room.roomId._id || room.roomId,
                        readingDate: { $gte: tenant.startDate }
                    }).sort({ readingDate: -1, createdAt: -1 });

                    return {
                        roomId: room.roomId._id || room.roomId,
                        roomNumber: room.roomNumber,
                        value: reading?.value ?? room.meterReadingStart ?? 0
                    };
                }));
            } else {
                // Legacy fallback
                const latestReadingEntry = await MeterReading.findOne({
                    tenantId: tenant._id,
                    readingDate: { $gte: tenant.startDate }
                }).sort({ readingDate: -1, createdAt: -1 });

                // Also check latest bill if no standalone reading
                const latestBill = await MonthlyBill.findOne({
                    tenantId: tenant._id,
                    createdAt: { $gte: tenant.startDate }
                }).sort({ year: -1, month: -1 });

                lastMeterReadings = [{
                    roomId: tenant.roomId?._id || tenant.roomId,
                    roomNumber: tenant.roomNumber,
                    value: latestReadingEntry?.value ?? latestBill?.meter?.endUnits ?? tenant.meterReadingStart ?? 0
                }];
            }

            // 3. Calculate Total Due
            // Sum of (total - paid) for all bills that are not fully paid since start date
            const unpaidBills = await MonthlyBill.find({
                tenantId: tenant._id,
                createdAt: { $gte: tenant.startDate },
                status: { $in: ['PENDING', 'PARTIAL'] }
            });

            const totalDue = unpaidBills.reduce((sum: number, bill: any) => {
                // Use the stored remainingDue from the payment object
                return sum + (bill.payments?.remainingDue || 0);
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

                // To calculate the "Next Rent Date" (Renewal Date):
                // User prefers to see the exact date of next billing (e.g. 1st Jan -> 1st Feb).

                let targetYear = today.getFullYear();
                let targetMonth = today.getMonth();

                // If today > startDay (e.g. 29th, Start 28th) -> Next billing is next month.
                // If today <= startDay (e.g. 10th or 28th, Start 28th) -> Next billing is this month (or today).
                if (today.getDate() > startDay) {
                    targetMonth += 1;
                }

                // Construct Date
                let nextDueDate = new Date(targetYear, targetMonth, startDay);

                // Handle Overflow (e.g. Start 31, target Feb -> Feb 28)
                const expectedMonth = (targetMonth % 12 + 12) % 12;
                if (nextDueDate.getMonth() !== expectedMonth) {
                    nextDueDate.setDate(0);
                }

                cycleEndDate = nextDueDate;
            }

            return {
                ...tenant.toObject(),
                stats: {
                    lastMeterReadings, // Updated property name
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
