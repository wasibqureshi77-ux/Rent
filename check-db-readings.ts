import connectDB from './src/lib/db';
import MeterReading from './src/models/MeterReading';
import mongoose from 'mongoose';

async function check() {
    try {
        await connectDB();
        const readings = await MeterReading.find({}).sort({ readingDate: -1, createdAt: -1 });
        console.log(JSON.stringify(readings, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
