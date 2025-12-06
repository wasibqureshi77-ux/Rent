import mongoose from 'mongoose';

const MeterReadingSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readingDate: { type: Date, required: true },
    value: { type: Number, required: true }, // Current meter reading
    unitsConsumed: { type: Number, required: true }, // Consumed since last reading
}, { timestamps: true });

export default mongoose.models.MeterReading || mongoose.model('MeterReading', MeterReadingSchema);
