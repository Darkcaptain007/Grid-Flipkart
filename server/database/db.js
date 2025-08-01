import mongoose from 'mongoose';
import dotenv from 'dotenv';

// This ensures your .env file is read
dotenv.config();

const Connection = async () => {
    const password = process.env.DB_PASSWORD;
    // This is the correct connection string you got from the Atlas website
    const URL = `mongodb+srv://yashanand37:${password}@cluster0.mwn1mjt.mongodb.net/flipkart?retryWrites=true&w=majority&appName=Cluster0`;

    try {
        // Connect without the old, unnecessary options
        await mongoose.connect(URL);
        
        console.log('Database Connected Successfully');
    } catch(error) {
        console.log('Error: ', error.message);
    }
};

export default Connection;