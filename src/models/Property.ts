import mongoose from 'mongoose';

const PropertySchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

// Index for efficient queries
PropertySchema.index({ ownerId: 1, isActive: 1 });

// Delete cached model to ensure schema updates are applied
if (mongoose.models.Property) {
    delete mongoose.models.Property;
}

export default mongoose.model('Property', PropertySchema);

