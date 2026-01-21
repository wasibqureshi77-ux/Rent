import connectDB from './src/lib/db';
import MeterReading from './src/models/MeterReading';
import Tenant from './src/models/Tenant';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixReadings() {
    try {
        await connectDB();
        console.log('Connected to DB');

        const readings = await MeterReading.find({ unitsConsumed: 0 });
        console.log(`Found ${readings.length} readings with 0 units consumed`);

        for (const reading of readings) {
            const previousReading = await MeterReading.findOne({
                tenantId: reading.tenantId,
                readingDate: { $lt: reading.readingDate }
            }).sort({ readingDate: -1 });

            let correctUnits = 0;
            if (previousReading) {
                correctUnits = reading.value - previousReading.value;
            } else {
                const tenant = await Tenant.findById(reading.tenantId);
                if (tenant) {
                    correctUnits = reading.value - (tenant.meterReadingStart || 0);
                }
            }

            if (correctUnits > 0) {
                reading.unitsConsumed = correctUnits;
                await reading.save();
                console.log(`Updated reading for tenant ${reading.tenantId} to ${correctUnits} units`);
            }
        }

        console.log('Done');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

fixReadings();
