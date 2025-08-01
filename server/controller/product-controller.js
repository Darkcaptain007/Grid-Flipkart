import Product from '../model/productSchema.js';
import { redisClient } from '../database/redis.js';
import mongoose from 'mongoose';

const CACHE_EXPIRATION_SECONDS = 3600;

export const getProducts = async (request, response) => {
  try {
    const { page = 1, limit = 20 } = request.query;  // Add pagination params
    const skip = (page - 1) * limit;

    const cachedProducts = await redisClient.get(`products:page:${page}`);
    if (cachedProducts) {
      return response.json(JSON.parse(cachedProducts));
    }

    const products = await Product.find({}).skip(skip).limit(parseInt(limit));  // Paginate
    await redisClient.setEx(`products:page:${page}`, 3600, JSON.stringify(products));  // Cache per page
    response.json(products);
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
};

// Similarly for getProductById:
export const getProductById = async (request, response) => {
  try {
    const productId = request.params.id;
    const cachedProduct = await redisClient.get(`product:${productId}`);
    if (cachedProduct) {
      return response.json(JSON.parse(cachedProduct));
    }

    let product = await Product.findById(productId) || await Product.findOne({ pid: productId });
    if (!product) return response.status(404).json({ message: 'Product not found' });

    await redisClient.setEx(`product:${productId}`, 3600, JSON.stringify(product));  // Cache
    response.json(product);
  } catch (error) {
    response.status(500).json({ message: error.message });
  }
};
