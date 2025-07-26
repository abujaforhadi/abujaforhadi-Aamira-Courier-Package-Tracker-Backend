import { Document } from 'mongoose';

export enum AlertType {
    STUCK_PACKAGE = 'STUCK_PACKAGE',
}

export interface IAlert extends Document {
    package_id: string;
    alert_type: AlertType;
    message: string;
    timestamp: Date;
    resolved: boolean;
    resolved_at?: Date;
}