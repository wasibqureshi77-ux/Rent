const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
// dotenv.config() by default looks for .env, we explicitly point to .env.local
const result = dotenv.config({ path: path.join(__dirname, '.env.local') });
if (result.error) {
    console.log("Error loading .env.local, checking .env");
    dotenv.config(); // fallback
}
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "Defined" : "Undefined");

async function checkUsers() {
    console.log("Connecting to:", process.env.MONGODB_URI.substring(0, 15) + "...");
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not defined in .env.local');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // We need to define schema briefly since we are in a script
        const UserSchema = new mongoose.Schema({
            name: String,
            email: String,
            role: String,
            isVerified: Boolean,
            isApproved: Boolean
        });

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const users = await User.find({});
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ${u.email} [${u.role}] Verified:${u.isVerified} Approved:${u.isApproved}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();
