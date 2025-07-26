import dotenv from 'dotenv';

dotenv.config();

if (!process.env.API_KEY) {
    console.error('ERROR: API_KEY environment variable is not set. The application cannot start securely.');
    process.exit(1);
}
if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI environment variable is not set. The application cannot connect to the database.');
    process.exit(1);
}

export const config = {
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI,
    API_KEY: process.env.API_KEY,
    STUCK_PACKAGE_THRESHOLD_MS: 30 * 60 * 1000,
    ALERT_CHECK_INTERVAL_MS: 60 * 1000,
};