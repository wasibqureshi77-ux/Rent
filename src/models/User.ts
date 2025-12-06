import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'owner'], default: 'owner' },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    settings: {
        fixedWaterBill: { type: Number, default: 0 },
        electricityRatePerUnit: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' }, // Assuming INR based on context "PG management" usually implies India, but can be generic.
    },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
