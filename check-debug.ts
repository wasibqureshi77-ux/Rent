import connectDB from './src/lib/db';
import MeterReading from './src/models/MeterReading';
import Tenant from './src/models/Tenant';
import mongoose from 'mongoose';

async function check() {
    try {
        await connectDB();
        const readings = await MeterReading.find({ unitsConsumed: 0 });
        for (const r of readings) {
            const t = await Tenant.findById(r.tenantId);
            console.log(`Reading Value: ${r.value}, Tenant Start: ${t?.meterReadingStart}, Tenant Name: ${t?.fullName}, Reading Date: ${r.readingDate}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
