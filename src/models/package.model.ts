import { Schema, model } from 'mongoose';
import { IPackage, IPackageEvent, PackageStatus } from '../interfaces/package.interfaces';

const generatePackageId = () => `PKG${Date.now()}${Math.floor(Math.random() * 1000)}`;

const PackageEventSchema = new Schema<IPackageEvent>({
    status: {
        type: String,
        enum: Object.values(PackageStatus),
        required: true,
    },
    lat: {
        type: Number,
        required: false,
    },
    lon: {
        type: Number,
        required: false,
    },
    timestamp: {
        type: Date,
        required: true,
    },
    note: {
        type: String,
        required: false,
    },
}, { _id: false });

const PackageSchema = new Schema<IPackage>({
    package_id: {
        type: String,
        required: true,
        unique: true,
        default: generatePackageId,
        index: true,
    },
    current_status: {
        type: String,
        enum: Object.values(PackageStatus),
        required: true,
    },
    current_lat: Number,
    current_lon: Number,
    current_status_timestamp: {
        type: Date,
        required: true,
    },
    eta: Date,
    received_at: {
        type: Date,
        default: Date.now,
        required: true,
    },
    last_updated: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    event_history: [PackageEventSchema],
    is_stuck_alert_triggered: {
        type: Boolean,
        default: false,
    }
});

export const Package = model<IPackage>('Package', PackageSchema);