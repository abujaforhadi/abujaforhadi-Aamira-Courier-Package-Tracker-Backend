import {  server, connectDB, startAlertService } from './app';
import { config } from './config';

const PORT = config.PORT;

const startServer = async () => {
    await connectDB();
    startAlertService();

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        
    });
};

startServer();