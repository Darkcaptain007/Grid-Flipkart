import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import Connection from './database/db.js';
import Routes from './routes/route.js';
import Product from './model/productSchema.js';
import { products } from './constants/product.js';
import { Client } from '@elastic/elasticsearch';
import compression from 'compression';

dotenv.config();

const app = express();
const PORT = 8000;

app.use(compression()); // Add this before other middleware

// --- ELASTICSEARCH & REDIS SETUP ---
export const esClient = new Client({ node: 'http://localhost:9200' });
const indexName = 'products';

async function setupElasticsearch() {
    console.log('Setting up Elasticsearch index...');
    const productsFromDB = await Product.find({});
    if (!productsFromDB || productsFromDB.length === 0) {
        console.log('No products in MongoDB to index.');
        return;
    }

    const indexExists = await esClient.indices.exists({ index: indexName });
    if (indexExists) await esClient.indices.delete({ index: indexName });

    await esClient.indices.create({
        index: indexName,
        body: {
            mappings: {
                properties: {
                    // Do NOT include _id here!
                    name: { type: 'search_as_you_type' },
                    category: { type: 'text' },
                    suggest: { type: 'completion' },
                    rating: { type: 'float' } // Added rating field for sorting
                }
            }
        }
    });

    const body = productsFromDB.flatMap(doc => {
        const source = {
            name: doc.title.longTitle,
            category: doc.title.shortTitle,
            suggest: [
                doc.title.longTitle,
                doc.title.shortTitle,
                doc.category,
                ...(doc.title.longTitle ? doc.title.longTitle.split(' ') : [])
            ].filter(Boolean),
            rating: doc.rating || 0 // Added rating to indexed data
        };
        return [{ index: { _index: indexName, _id: doc._id.toString() } }, source];
    });

    await esClient.bulk({ refresh: true, body });
    console.log(`${productsFromDB.length} products from MongoDB indexed into Elasticsearch.`);
}

const insertDefaultData = async () => {
    try {
        const count = await Product.countDocuments();
        if (count > 0) {
            console.log('Products already exist in DB. Skipping default data insertion.');
            return;
        }
        await Product.insertMany(products);
        console.log('Default product data imported successfully.');
    } catch (error) {
        console.error('Error inserting default product data:', error.message);
    }
};

Connection()
    .then(() => {
        insertDefaultData();
        setupElasticsearch().catch(console.error);
    });

// Middleware and routes
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use('/', Routes);

// Start the server
app.listen(PORT, () => console.log(`Server is running successfully on PORT ${PORT}`));
