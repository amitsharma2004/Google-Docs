import mongoose from "mongoose";
import logger from "../utils/logger.js";

const dbConnect = async () => {
    const MONGOOSE_URL = process.env.MONGOOSE_URL || "";
    
    if (MONGOOSE_URL.trim() === "") {
        throw new Error('MONGOOSE_URL is not defined in environment variables');
    }
    
    try {
        const connection = await mongoose.connect(MONGOOSE_URL);
        logger.info(`MongoDB is connected: ${connection.connection.host}`);
        return connection;
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        throw error;
    }
}

export { dbConnect };