import { Document } from 'mongoose';

export enum PackageStatus {
    CREATED = 'CREATED',
    PICKED_UP = 'PICKED_UP',
    IN_TRANSIT = 'IN_TRANSIT',
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
    DELIVERED = 'DELIVERED',
    EXCEPTION = 'EXCEPTION',
    CANCELLED = 'CANCELLED',
}

export interface IPackageEvent {
    status: PackageStatus;
    lat?: number;
    lon?: number;
    timestamp: Date;
    note?: string;
}

export interface IPackage extends Document {
    package_id: string;
    current_status: PackageStatus;
    current_lat?: number;
    current_lon?: number;
    current_status_timestamp: Date;
    eta?: Date;
    received_at: Date;
    last_updated: Date;
    event_history: IPackageEvent[];
    is_stuck_alert_triggered?: boolean;
}