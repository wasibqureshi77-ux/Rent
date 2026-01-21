import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
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
    roomNumber: {
        type: String,
        required: true
    },
    floorNumber: {
        type: String,
        required: true
    },
    type: {
        type: String, // 'ROOM', 'FLAT'
        default: 'ROOM'
    },
    currentTenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        default: null
    },
    currentMeterReading: {
        type: Number,
        default: 0
    },
    currentKitchenMeterReading: {
        type: Number,
        default: 0
    },
    baseRent: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Compound unique index: Room number should be unique within a property
RoomSchema.index({ propertyId: 1, roomNumber: 1 }, { unique: true });

if (mongoose.models.Room) {
    delete mongoose.models.Room;
}

export default mongoose.model('Room', RoomSchema);
