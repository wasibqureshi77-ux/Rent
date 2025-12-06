import mongoose from 'mongoose';

const BillSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // Format: YYYY-MM
    rentAmount: { type: Number, required: true },
    waterCharge: { type: Number, required: true },
    electricityUsage: { type: Number, required: true }, // Units
    electricityRate: { type: Number, required: true }, // Rate per unit at time of billing
    electricityAmount: { type: Number, required: true }, // Usage * Rate
    previousDues: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['paid', 'partial', 'pending', 'overdue'], default: 'pending' },
    dueDate: { type: Date, required: true },
    paymentHistory: [{
        amount: Number,
        date: { type: Date, default: Date.now },
        method: String, // 'cash', 'upi', 'bank_transfer'
        reference: String
    }]
}, { timestamps: true });

// Ensure one bill per tenant per month
BillSchema.index({ tenantId: 1, month: 1 }, { unique: true });

export default mongoose.models.Bill || mongoose.model('Bill', BillSchema);
