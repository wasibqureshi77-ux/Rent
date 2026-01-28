import mongoose from 'mongoose';

const PaymentHistorySchema = new mongoose.Schema({
    paidOn: { type: Date, required: true },
    amount: { type: Number, required: true },
    mode: { type: String },
    note: { type: String }
}, { _id: false });

const MonthlyBillSchema = new mongoose.Schema({
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
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true,
        index: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true
    },

    // Meter readings (Legacy - Single Room)
    meter: {
        startUnits: { type: Number, default: 0 },
        endUnits: { type: Number, default: 0 },
        unitsConsumed: { type: Number, default: 0 }
    },

    // New: Multiple Rooms Support
    roomDetails: [{
        roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
        roomNumber: String,
        rentAmount: Number,
        meter: {
            startUnits: Number,
            endUnits: Number,
            unitsConsumed: Number
        }
    }],

    // Amounts
    amounts: {
        ratePerUnit: { type: Number, required: true, default: 0 },
        waterCharge: { type: Number, required: true, default: 0 },
        rentAmount: { type: Number, required: true, default: 0 },
        previousDue: { type: Number, default: 0 },
        electricityAmount: { type: Number, required: true, default: 0 },
        totalAmount: { type: Number, required: true, default: 0 }
    },

    // Payments
    payments: {
        amountPaid: { type: Number, default: 0 },
        remainingDue: { type: Number, default: 0 },
        paymentHistory: [PaymentHistorySchema]
    },

    // Status
    status: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'PAID'],
        default: 'PENDING'
    },
    notes: { type: String },
}, { timestamps: true });

// Unique constraint removed to allow multiple bills
// MonthlyBillSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });

// Compound indexes for efficient queries
MonthlyBillSchema.index({ ownerId: 1, propertyId: 1, month: 1, year: 1 });
MonthlyBillSchema.index({ ownerId: 1, status: 1 });

// Delete cached model to ensure schema updates are applied
if (mongoose.models.MonthlyBill) {
    delete mongoose.models.MonthlyBill;
}

export default mongoose.model('MonthlyBill', MonthlyBillSchema);

