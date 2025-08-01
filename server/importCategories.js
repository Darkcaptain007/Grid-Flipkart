import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Category Schema
const categorySchema = new mongoose.Schema({
    category: String,
    subcategory: String
});

const Category = mongoose.model('Category', categorySchema);

async function importCategoryData() {
    try {
        // Check if environment variable exists
        if (!process.env.DB_PASSWORD) {
            console.error('DB_PASSWORD environment variable is not set!');
            console.log('Please check your .env file in the server directory');
            return;
        }

        const password = process.env.DB_PASSWORD;
        const URL = `mongodb+srv://yashanand37:${password}@cluster0.mwn1mjt.mongodb.net/flipkart?retryWrites=true&w=majority&appName=Cluster0`;
        
        console.log('Connecting to MongoDB...');
        await mongoose.connect(URL);
        console.log('Database connected successfully for category import.');
    } catch (error) {
        console.error('Error connecting to database:', error.message);
        return;
    }

    try {
        await Category.deleteMany({});
        console.log('Existing categories collection cleared.');
    } catch (error) {
        console.error('Error clearing categories collection:', error.message);
        mongoose.connection.close();
        return;
    }

    const categoriesToSave = [];
    const csvFilePath = path.resolve(process.cwd(), 'categories_subcategories_list.csv');

    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
        console.error(`Category CSV file not found at: ${csvFilePath}`);
        mongoose.connection.close();
        return;
    }

    console.log(`Reading category CSV file from: ${csvFilePath}`);

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            if (row.category && row.category.trim() !== '') {
                categoriesToSave.push({
                    category: row.category.trim(),
                    subcategory: row.subcategory ? row.subcategory.trim() : ''
                });
            }
        })
        .on('end', async () => {
            console.log('Category CSV file processing finished.');
            try {
                if (categoriesToSave.length > 0) {
                    await Category.insertMany(categoriesToSave);
                    console.log(`${categoriesToSave.length} categories imported successfully!`);
                } else {
                    console.log('No categories found in CSV to import.');
                }
            } catch (error) {
                console.error('Error inserting category data:', error.message);
            } finally {
                mongoose.connection.close();
                console.log('Database connection closed.');
            }
        })
        .on('error', (error) => {
            console.error('Error reading CSV file:', error.message);
            mongoose.connection.close();
        });
}

importCategoryData();
