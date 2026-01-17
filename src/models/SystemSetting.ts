import mongoose from 'mongoose';

const SystemSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // e.g., 'global_config'
    monthlyPlatformFee: { type: Number, default: 0 },
    razorpayKeyId: { type: String, default: '' },
    razorpayKeySecret: { type: String, default: '' },
}, { timestamps: true });

// Force clear for schema updates
if (mongoose.models.SystemSetting) {
    delete mongoose.models.SystemSetting;
}

export default mongoose.model('SystemSetting', SystemSettingSchema);
