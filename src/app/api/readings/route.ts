import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MeterReading from '@/models/MeterReading';
import Tenant from '@/models/Tenant';

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

        let query: any = { ownerId: session.user.id };

        if (tenantId) {
            query.tenantId = tenantId;
        }

        // If filtering by month, we need to match the date range
        if (month) {
            const start = new Date(`${month}-01`);
            const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
            query.readingDate = { $gte: start, $lt: end };
        }

        const readings = await MeterReading.find(query)
            .populate('tenantId', 'name roomNo')
            .sort({ readingDate: -1 });

        return NextResponse.json(readings);
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

        // Calculate units consumed
        // Find the previous reading for this tenant
        const previousReading = await MeterReading.findOne({
            tenantId,
            readingDate: { $lt: new Date(readingDate) }
        }).sort({ readingDate: -1 });

        let unitsConsumed = 0;
        if (previousReading) {
            unitsConsumed = value - previousReading.value;
            if (unitsConsumed < 0) {
                return NextResponse.json({ message: 'New reading cannot be lower than previous reading' }, { status: 400 });
            }
        } else {
            // First reading, units consumed is 0 or based on initial meter setting (assuming 0 for now)
            unitsConsumed = 0; // Or treat 'value' as consumed if starting from 0? Usually meter starts at X.
            // Let's assume unitsConsumed = 0 for the very first entry unless base is provided.
            // Or user prompts "Previous Reading" manually?
            // Simpler: Just save 0 units for first time.
        }

        const reading = await MeterReading.create({
            tenantId,
            ownerId: session.user.id,
            readingDate,
            value,
            unitsConsumed
        });

        return NextResponse.json(reading, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Error saving reading' }, { status: 500 });
    }
}
