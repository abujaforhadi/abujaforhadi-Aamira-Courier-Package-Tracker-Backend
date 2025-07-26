import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Package } from '../models/package.model';
import { PackageStatus } from '../interfaces/package.interfaces';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export const setIoInstance = (ioInstance: SocketIOServer) => {
    io = ioInstance;
};

export const createPackageEvent = async (req: Request, res: Response) => {
    try {
        const { package_id, status, lat, lon, timestamp, note } = req.body;

        if (  !timestamp) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Missing required fields: package_id, status, timestamp.' });
        }

        const eventTimestamp = new Date(timestamp);
        const now = new Date();

        let packageDoc = await Package.findOne({ package_id });

        const newEvent = {
            status: status as PackageStatus,
            lat,
            lon,
            timestamp: eventTimestamp,
            note,
        };

        if (!packageDoc) {
            packageDoc = await Package.create({
                package_id,
                current_status: status,
                current_lat: lat,
                current_lon: lon,
                current_status_timestamp: eventTimestamp,
                received_at: now,
                last_updated: now,
                event_history: [newEvent],
                is_stuck_alert_triggered: false,
            });
            io.emit('packageCreated', packageDoc.toObject());
            res.status(StatusCodes.CREATED).json({
                message: 'Package created successfully.',
                data: packageDoc.toObject(),
            });
        } else {
            let needsUpdate = false;
            const updateFields: any = {
                $push: { event_history: newEvent },
                $set: { last_updated: now },
            };

            if (!packageDoc.current_status_timestamp || eventTimestamp > packageDoc.current_status_timestamp) {
                updateFields.$set.current_status = status;
                updateFields.$set.current_lat = lat;
                updateFields.$set.current_lon = lon;
                updateFields.$set.current_status_timestamp = eventTimestamp;
                
                if (packageDoc.current_status === PackageStatus.DELIVERED || packageDoc.current_status === PackageStatus.CANCELLED) {
                    if (status !== PackageStatus.DELIVERED && status !== PackageStatus.CANCELLED) {
                        updateFields.$set.is_stuck_alert_triggered = false;
                    }
                } else if (packageDoc.current_status !== status) {
                    updateFields.$set.is_stuck_alert_triggered = false;
                }
                needsUpdate = true;
            } else {
                needsUpdate = true;
            }

            if (needsUpdate) {
                 const lastEvent = packageDoc.event_history[packageDoc.event_history.length - 1];
                 if (lastEvent && lastEvent.status === newEvent.status && lastEvent.timestamp.getTime() === newEvent.timestamp.getTime()) {
                    return res.status(StatusCodes.OK).json({
                        message: 'Duplicate event received and ignored for current state update, history still appended if not exact duplicate.',
                        data: packageDoc.toObject(),
                    });
                 }

                const updatedPackage = await Package.findOneAndUpdate(
                    { package_id },
                    updateFields,
                    { new: true, projection: { __v: 0 } }
                ).lean();

                if (updatedPackage) {
                    io.emit('packageUpdated', updatedPackage);
                    res.status(StatusCodes.OK).json({
                        message: 'Package updated successfully.',
                        data: updatedPackage,
                    });
                } else {
                    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Package not found during update.' });
                }
            } else {
                res.status(StatusCodes.OK).json({
                    message: 'Event received but current package state not updated (older or duplicate event).',
                    data: packageDoc.toObject(),
                });
            }
        }
    } catch (error) {
        const err = error as Error;
        console.error('Error in createPackageEvent:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Server error: ${err.message}` });
    }
};

export const getPackages = async (req: Request, res: Response) => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const packages = await Package.find({
            current_status: { $nin: [PackageStatus.DELIVERED, PackageStatus.CANCELLED] },
            last_updated: { $gte: last24h }
        }, { __v: 0 }).lean();

        res.status(StatusCodes.OK).json(packages);
    } catch (error) {
        const err = error as Error;
        console.error('Error in getPackages:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Server error: ${err.message}` });
    }
};

export const getPackage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pkg = await Package.findOne({ package_id: id }, { __v: 0 }).lean();

        if (!pkg) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Package not found.' });
        }
        res.status(StatusCodes.OK).json(pkg);
    } catch (error) {
        const err = error as Error;
        console.error('Error in getPackage:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Server error: ${err.message}` });
    }
};

export const updatePackageStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, lat, lon, note } = req.body;

        if (!status) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Missing required field: status.' });
        }

        const now = new Date();
        const newEvent = {
            status: status as PackageStatus,
            lat,
            lon,
            timestamp: now,
            note,
        };

        const packageDoc = await Package.findOne({ package_id: id });

        if (!packageDoc) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Package not found.' });
        }

        let updateFields: any = {
            $push: { event_history: newEvent },
            $set: { last_updated: now },
        };

        updateFields.$set.current_status = status;
        updateFields.$set.current_lat = lat;
        updateFields.$set.current_lon = lon;
        updateFields.$set.current_status_timestamp = now;

        if (packageDoc.current_status === PackageStatus.DELIVERED || packageDoc.current_status === PackageStatus.CANCELLED) {
            if (status !== PackageStatus.DELIVERED && status !== PackageStatus.CANCELLED) {
                updateFields.$set.is_stuck_alert_triggered = false;
            }
        } else if (packageDoc.current_status !== status) {
            updateFields.$set.is_stuck_alert_triggered = false;
        }

        const updatedPackage = await Package.findOneAndUpdate(
            { package_id: id },
            updateFields,
            { new: true, projection: { __v: 0 } }
        ).lean();

        if (updatedPackage) {
            io.emit('packageUpdated', updatedPackage);
            res.status(StatusCodes.OK).json({
                message: 'Package status updated.',
                data: updatedPackage,
            });
        } else {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Package not found after update attempt.' });
        }

    } catch (error) {
        const err = error as Error;
        console.error('Error in updatePackageStatus:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Server error: ${err.message}` });
    }
};