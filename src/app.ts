import express, { Application } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import packageRoutes from './routes/package.routes';
import { setIoInstance } from './controllers/package.controller';
import { setIoInstanceForAlerts, startAlertService } from './services/alert.service';

const app: Application = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT'],
    },
});

setIoInstance(io);
setIoInstanceForAlerts(io);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api', packageRoutes);

app.get('/', (req, res) => {
    res.status(200).send('Aamira Courier Package Tracker API is running!');
});

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGO_URI);
        console.log('MongoDB connected successfully.');
    } catch (err) {
        // console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

export { app, server, connectDB, startAlertService };