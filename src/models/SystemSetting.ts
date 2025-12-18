import mongoose from 'mongoose';

const SystemSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // e.g., 'global_config'
    monthlyPlatformFee: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema);
