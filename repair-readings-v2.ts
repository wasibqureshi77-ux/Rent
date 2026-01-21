import connectDB from './src/lib/db';
import MeterReading from './src/models/MeterReading';
import Tenant from './src/models/Tenant';
import mongoose from 'mongoose';

async function repair() {
    try {
        await connectDB();
        const readings = await MeterReading.find({}).sort({ readingDate: 1, createdAt: 1 });

        for (let i = 0; i < readings.length; i++) {
            const current = readings[i];

            // Find the reading immediately before this one for the same tenant
            const previous = await MeterReading.findOne({
                tenantId: current.tenantId,
                $or: [
                    { readingDate: { $lt: current.readingDate } },
                    { readingDate: current.readingDate, createdAt: { $lt: current.createdAt } }
                ]
            }).sort({ readingDate: -1, createdAt: -1 });

            let baseline = 0;
            if (previous) {
                baseline = previous.value;
            } else {
                const tenant = await Tenant.findById(current.tenantId);
                baseline = tenant?.meterReadingStart || 0;
            }

            current.previousValue = baseline;
            current.unitsConsumed = current.value - baseline;
            if (current.unitsConsumed < 0) current.unitsConsumed = 0;

            await current.save();
            console.log(`Updated reading for tenant ${current.tenantId}: ${baseline} -> ${current.value} (${current.unitsConsumed} units)`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

repair();
