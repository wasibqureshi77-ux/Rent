import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'PROPERTY_OWNER'],
        default: 'PROPERTY_OWNER'
    },
    status: {
        type: String,
        enum: ['PENDING_EMAIL_VERIFICATION', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'OVERDUE'],
        default: 'PENDING_EMAIL_VERIFICATION'
    },
    emailVerifiedAt: { type: Date },
    verificationToken: { type: String },
    verificationTokenExpiry: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    themePreference: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
    },
    phone: { type: String },
    propertyName: { type: String },
    settings: {
        fixedWaterBill: { type: Number, default: 0 },
        electricityRatePerUnit: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' },
        upiQrCode: { type: String }
    },
    subscription: {
        status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'OVERDUE'], default: 'INACTIVE' },
        nextBillingDate: { type: Date },
        lastPaymentDate: { type: Date },
        planAmount: { type: Number }
    },
}, { timestamps: true });

// Force clear the model from cache to ensure schema updates are recognized
if (mongoose.models.User) {
    delete (mongoose.models as any).User;
}

const User = mongoose.model('User', UserSchema);
export default User;
