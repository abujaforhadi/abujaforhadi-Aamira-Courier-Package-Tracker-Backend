import { Package } from '../models/package.model';
import { Alert } from '../models/alert.model';
import { PackageStatus } from '../interfaces/package.interfaces';
import { config } from '../config';
import { Server as SocketIOServer } from 'socket.io';
import { AlertType } from '../interfaces/alert.interfaces';

let io: SocketIOServer;

export const setIoInstanceForAlerts = (ioInstance: SocketIOServer) => {
    io = ioInstance;
};

export const checkStuckPackages = async () => {
    const now = new Date();
    const threshold = config.STUCK_PACKAGE_THRESHOLD_MS;

    try {
        const stuckPackages = await Package.find({
            current_status: { $nin: [PackageStatus.DELIVERED, PackageStatus.CANCELLED] },
            is_stuck_alert_triggered: false,
            current_status_timestamp: { $lte: new Date(now.getTime() - threshold) }
        }).lean();

        if (stuckPackages.length > 0) {
            console.log(`Found ${stuckPackages.length} stuck packages.`);
        }

        for (const pkg of stuckPackages) {
            const message = `Package ${pkg.package_id} is stuck! No status update in over ${threshold / (1000 * 60)} minutes. Current status: ${pkg.current_status}. Last update: ${pkg.current_status_timestamp?.toLocaleString()}`;
            console.warn(`ALERT: ${message}`);

            const newAlert = await Alert.create({
                package_id: pkg.package_id,
                alert_type: AlertType.STUCK_PACKAGE,
                message,
                timestamp: now,
                resolved: false,
            });

            await Package.findOneAndUpdate(
                { package_id: pkg.package_id },
                { $set: { is_stuck_alert_triggered: true } }
            );

            io.emit('newAlert', newAlert.toObject());
            io.emit('packageUpdated', { ...pkg, is_stuck_alert_triggered: true });
        }
    } catch (error) {
        const err = error as Error;
        console.error('Error checking stuck packages:', err);
    }
};

export const startAlertService = () => {
    console.log(`Stuck package alert service started. Checking every ${config.ALERT_CHECK_INTERVAL_MS / 1000} seconds.`);
    setInterval(checkStuckPackages, config.ALERT_CHECK_INTERVAL_MS);
};