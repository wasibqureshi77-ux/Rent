import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    idProof: { type: String }, // URL or path
    roomNo: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    joinedDate: { type: Date, default: Date.now },
    rentAmount: { type: Number, required: true }, // Base rent
    securityDeposit: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);
