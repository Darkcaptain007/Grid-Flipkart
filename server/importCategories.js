import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './model/categorySchema.js'; // Import the model

dotenv.config();

// --- Define your two CSV files ---
const BASE_CATEGORIES_FILE = 'categories_subcategories_list.csv';
const SEARCH_STRINGS_FILE = 'combined_unique.csv';

// Helper function to process a single CSV file and return its data as a promise
const processCsvFile = (filePath, isSearchStringFile = false) => {
    return new Promise((resolve, reject) => {
        const documents = [];
        console.log(`Reading from: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            console.warn(`WARNING: File not found, skipping: ${filePath}`);
            return resolve([]); // Resolve with an empty array if file doesn't exist
        }

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                const doc = {
                    category: row.category ? row.category.trim() : null,
                    subcategory: row.subcategory ? row.subcategory.trim() : null,
                };

                // Only add search_string if it's the specific file and the column exists
                if (isSearchStringFile && row.search_string && row.search_string.trim()) {
                    doc.search_string = row.search_string.trim();
                }

                // Ensure we have at least a subcategory to make the entry useful
                if (doc.subcategory) {
                    documents.push(doc);
                }
            })
            .on('end', () => {
                console.log(`Finished processing ${filePath}. Found ${documents.length} valid rows.`);
                resolve(documents);
            })
            .on('error', (error) => {
                console.error(`Error reading ${filePath}:`, error.message);
                reject(error);
            });
    });
};


async function importAllCategoryData() {
    try {
        if (!process.env.DB_PASSWORD) {
            throw new Error('DB_PASSWORD environment variable is not set!');
        }
        const password = process.env.DB_PASSWORD;
        const URL = `mongodb+srv://yashanand37:${password}@cluster0.mwn1mjt.mongodb.net/flipkart?retryWrites=true&w=majority&appName=Cluster0`;
        
        console.log('Connecting to MongoDB...');
        await mongoose.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Database connected successfully for combined category import.');
    } catch (error) {
        console.error('Error connecting to database:', error.message);
        return;
    }

    try {
        await Category.deleteMany({});
        console.log('Existing categories collection cleared.');

        // --- Process both files concurrently ---
        const basePath = path.resolve(process.cwd());
        const [baseCategories, searchStringCategories] = await Promise.all([
            processCsvFile(path.join(basePath, BASE_CATEGORIES_FILE), false),
            processCsvFile(path.join(basePath, SEARCH_STRINGS_FILE), true)
        ]);

        // --- Combine the data from both files ---
        const allDocuments = [...baseCategories, ...searchStringCategories];

        if (allDocuments.length > 0) {
            await Category.insertMany(allDocuments);
            console.log(`SUCCESS: ${allDocuments.length} total documents imported from both files!`);
        } else {
            console.log('No documents found in either CSV to import.');
        }

    } catch (error) {
        console.error('An error occurred during the import process:', error.message);
    } finally {
        mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

importAllCategoryData();