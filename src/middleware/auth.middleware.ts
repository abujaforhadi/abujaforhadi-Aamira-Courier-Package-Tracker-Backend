import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { config } from '../config';

export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized: No API Key provided.' });
    }

    if (apiKey !== config.API_KEY) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'Forbidden: Invalid API Key.' });
    }

    next();
};