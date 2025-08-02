import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './model/productSchema.js';

dotenv.config();

async function importCSVData() {
    try {
        const password = process.env.DB_PASSWORD;
        const URL = `mongodb+srv://yashanand37:${password}@cluster0.mwn1mjt.mongodb.net/flipkart?retryWrites=true&w=majority&appName=Cluster0`;
        await mongoose.connect(URL);
        console.log('Database connected successfully for import.');
    } catch (error) {
        console.error('Error connecting to database:', error.message);
        return;
    }

    try {
        await Product.deleteMany({});
        console.log('Existing products collection cleared.');
    } catch (error) {
        console.error('Error clearing products collection:', error.message);
        mongoose.connection.close();
        return;
    }

    const productsToSave = [];
    const csvFilePath = path.resolve(process.cwd(), 'cleaned_combined.csv');

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            // Parse prices properly - remove currency symbols and convert to numbers
            const retailPrice = parseFloat(row.retail_price?.replace(/[₹,]/g, '')) || 0;
            const discountedPrice = parseFloat(row.discounted_price?.replace(/[₹,]/g, '')) || 0;
            
            let discount = '0%';
            if (retailPrice > 0 && discountedPrice < retailPrice) {
                discount = Math.round(((retailPrice - discountedPrice) / retailPrice) * 100) + '% off';
            }

            const formattedProduct = {
                id: row.pid, // Use pid as the main ID
                pid: row.pid, // Keep pid field as well
                url: row.image || 'https://via.placeholder.com/300',
                detailUrl: row.image || 'https://via.placeholder.com/300',
                title: {
                    shortTitle: row.category || row.subcategory || 'Product',
                    longTitle: row.product_name || 'Unknown Product'
                },
                price: {
                    mrp: retailPrice,
                    cost: discountedPrice,
                    discount: discount
                },
                description: row.description || 'No description available.',
                discount: discount,
                tagline: row.brand || row.category || 'Product',
                brand: row.brand,
                category: row.category,
                subcategory: row.subcategory,
                rating: parseFloat(row.product_rating) || 0,
                specifications: row.product_specifications
            };
            
            console.log(`Processing: ${formattedProduct.title.longTitle}`);
            productsToSave.push(formattedProduct);
        })
        .on('end', async () => {
            console.log('CSV file processing finished.');
            try {
                if (productsToSave.length > 0) {
                    await Product.insertMany(productsToSave);
                    console.log(`${productsToSave.length} products imported successfully!`);
                } else {
                    console.log('No products found in CSV to import.');
                }
            } catch (error) {
                console.error('Error inserting data:', error.message);
            } finally {
                mongoose.connection.close();
                console.log('Database connection closed.');
            }
        });
}

importCSVData();
