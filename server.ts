import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3000;

app.listen (PORT, () => {
    console.log (`Server is running on ${PORT}`);
})

process.on('SIGINT', () => {
    console.log('Gracefully shutting down');
    process.exit(0);
});