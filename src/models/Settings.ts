import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    defaultWaterCharge: {
        type: Number,
        default: 0
    },
    defaultRatePerUnit: {
        type: Number,
        default: 0
    },
    ownerEmail: {
        type: String,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
}, { timestamps: true });

// Delete cached model to ensure schema updates are applied
if (mongoose.models.Settings) {
    delete mongoose.models.Settings;
}

export default mongoose.model('Settings', SettingsSchema);

