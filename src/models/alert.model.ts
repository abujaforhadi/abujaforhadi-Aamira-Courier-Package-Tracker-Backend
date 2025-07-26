import { Schema, model } from 'mongoose';
import { AlertType, IAlert } from '../interfaces/alert.interfaces';

const AlertSchema = new Schema<IAlert>({
    package_id: {
        type: String,
        required: true,
        index: true,
    },
    alert_type: {
        type: String,
        enum: Object.values(AlertType),
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true,
    },
    resolved: {
        type: Boolean,
        default: false,
    },
    resolved_at: {
        type: Date,
        required: false,
    }
}, { timestamps: true });

export const Alert = model<IAlert>('Alert', AlertSchema);