import { createClient } from 'redis';

export const redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
await redisClient.connect();
console.log('Connected to Redis.');

export async function getUserProfile(userId) {
    try {
        const profileJSON = await redisClient.get(`user:${userId}`);
        return profileJSON ? JSON.parse(profileJSON) : { clicked_products: [] };
    } catch (err) {
        return null;
    }
}

export async function updateUserProfile(userId, productId) {
    try {
        const profile = await getUserProfile(userId);
        if (profile && !profile.clicked_products.includes(productId)) {
            profile.clicked_products.push(productId);
            await redisClient.set(`user:${userId}`, JSON.stringify(profile));
            console.log(`User ${userId} profile updated with product ${productId}`);
        }
    } catch (err) {
        console.error('Error updating user profile:', err);
    }
}