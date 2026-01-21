import connectDB from './src/lib/db';
import Tenant from './src/models/Tenant';
import mongoose from 'mongoose';

async function find() {
    try {
        await connectDB();
        const t = await Tenant.findOne({ fullName: /wasib/i });
        console.log(JSON.stringify(t, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

find();
