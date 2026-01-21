import connectDB from './src/lib/db';
import Room from './src/models/Room';
import mongoose from 'mongoose';

async function find() {
    try {
        await connectDB();
        const r = await Room.findOne({ roomNumber: 'a-4' });
        console.log(JSON.stringify(r, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

find();
