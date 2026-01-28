import mongoose from 'mongoose';

const IdProofSchema = new mongoose.Schema({
    type: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    documentNumber: { type: String },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const TenantSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: false, // Made optional
        index: true
    },
    rooms: [{
        roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
        roomNumber: { type: String, required: true },
        baseRent: { type: Number, default: 0 },
        meterReadingStart: { type: Number, default: 0 }
    }],
    fullName: {
        type: String,
        required: true
    },
    roomNumber: {
        type: String,
        required: false // Made optional
    },
    phoneNumber: {
        type: String,
        required: true
    },
    alternatePhoneNumber: { type: String },
    email: { type: String },
    baseRent: {
        type: Number,
        required: false // Made optional
    },
    idProofs: [IdProofSchema],
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: { type: Date },
    isActive: {
        type: Boolean,
        default: true
    },
    outstandingBalance: {
        type: Number,
        default: 0
    },
    meterReadingStart: {
        type: Number,
        default: 0
    }, // Deprecated, use rooms array
}, { timestamps: true });

// Compound indexes for efficient queries
TenantSchema.index({ ownerId: 1, propertyId: 1, isActive: 1 });
TenantSchema.index({ ownerId: 1, roomNumber: 1 });

// Delete cached model to ensure schema updates are applied
if (mongoose.models.Tenant) {
    delete mongoose.models.Tenant;
}

export default mongoose.model('Tenant', TenantSchema);

