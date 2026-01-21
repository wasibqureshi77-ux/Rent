import connectDB from './src/lib/db';
import MeterReading from './src/models/MeterReading';
import Tenant from './src/models/Tenant';
import mongoose from 'mongoose';

async function testApi() {
    try {
        await connectDB();
        // Ensure models are registered
        const _t = Tenant;

        const readings = await MeterReading.find({})
            .populate('tenantId', 'fullName roomNumber')
            .sort({ readingDate: -1 });

        console.log(JSON.stringify(readings, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

testApi();
