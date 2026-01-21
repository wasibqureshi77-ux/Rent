import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MeterReading from '@/models/MeterReading';
import Tenant from '@/models/Tenant';
import Room from '@/models/Room';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenantId');
        const month = url.searchParams.get('month'); // YYYY-MM

        let query: any = {};
        if (session.user.role !== 'SUPER_ADMIN') {
            query.ownerId = session.user.id;
        }

        if (tenantId) {
            query.tenantId = tenantId;
        }

        const roomId = url.searchParams.get('roomId');
        if (roomId) {
            query.roomId = roomId;
        }

        // If filtering by month, we need to match the date range
        if (month) {
            const start = new Date(`${month}-01`);
            const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
            query.readingDate = { $gte: start, $lt: end };
        }

        const readings = await MeterReading.find(query)
            .populate('tenantId', 'fullName roomNumber')
            .sort({ readingDate: -1, createdAt: -1 });

        return NextResponse.json(readings, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching readings' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    try {
        const body = await req.json();
        const { tenantId, readingDate, value } = body;

        // Fetch tenant to get roomId and start value
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
        }

        // Calculate units consumed
        // Find the most recent reading valid for current lease
        const previousReading = await MeterReading.findOne({
            tenantId,
            readingDate: {
                $lte: new Date(readingDate),
                $gte: tenant.startDate
            }
        }).sort({ readingDate: -1, createdAt: -1 });

        let unitsConsumed = 0;
        let baselineValue = 0;

        if (previousReading) {
            baselineValue = previousReading.value;
            unitsConsumed = value - baselineValue;
        } else {
            baselineValue = tenant.meterReadingStart || 0;
            unitsConsumed = value - baselineValue;
        }

        // Check if this new reading is actually higher than the baseline
        if (unitsConsumed < 0) {
            return NextResponse.json({
                message: `New reading (${value}) cannot be lower than previous value (${baselineValue})`
            }, { status: 400 });
        }

        const reading = await MeterReading.create({
            tenantId,
            roomId: tenant.roomId,
            ownerId: session.user.id,
            readingDate,
            value,
            previousValue: baselineValue,
            unitsConsumed
        });

        // Update Room Model to reflect latest reading
        if (tenant.roomId) {
            await Room.findByIdAndUpdate(tenant.roomId, {
                currentMeterReading: value
            });
        }

        return NextResponse.json(reading, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Error saving reading' }, { status: 500 });
    }
}
