import Product from '../model/productSchema.js';
import Category from '../model/categorySchema.js';
import { esClient } from '../index.js';
import { updateUserProfile, getUserProfile, redisClient } from '../database/redis.js';
import { expandQueryWithAbbreviations } from '../constants/abbreviations.js';
import axios from 'axios'; // <-- Make sure to import axios

const indexName = 'products';

// UPDATED: Enhanced regex escape to handle trailing/invalid backslashes (double-escape '\')
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').replace(/\\/g, '\\\\');
}

// --- Personalized Search Controller: Returns ranked products + category suggestions ---
export const personalizedSearch = async (req, res) => {
    const { q: searchQuery } = req.query;
    if (!searchQuery) {
        return res.status(400).send('Query "q" is required.');
    }

    try {
        // 1. Call the SRP service to get ranked product IDs
        console.log(`[Node Server] Calling SRP service for query: "${searchQuery}"`);
        const srpResponse = await axios.post(`${process.env.SRP_API_URL}/api/search`, {
            query: searchQuery
        });

        const ranked_ids = srpResponse.data.ranked_ids;

        if (!ranked_ids || ranked_ids.length === 0) {
            return res.json([]); // Return empty if SRP found no results
        }

        console.log(`[Node Server] Received ${ranked_ids.length} ranked IDs from SRP.`);

        // 2. Fetch full product details from MongoDB for the ranked IDs
        const products = await Product.find({ id: { $in: ranked_ids } });

        // 3. Create a map for quick lookup to preserve the order from SRP
        const productMap = new Map();
        products.forEach(product => {
            // Use 'id' field which corresponds to 'pid' from your CSV
            productMap.set(product.id, product);
        });

        // 4. Re-sort the fetched products based on the SRP's ranking
        const sortedProducts = ranked_ids
            .map(id => productMap.get(id))
            .filter(product => product !== undefined); // Filter out any products not found in DB

        console.log(`[Node Server] Returning ${sortedProducts.length} full product objects to client.`);
        
        // 5. Respond to the client
        res.json(sortedProducts);

    } catch (error) {
        console.error('Error in personalizedSearch calling SRP service:', error.response ? error.response.data : error.message);
        // Implement a fallback to your old search logic if you want
        // For now, we just return an error
        res.status(500).json({ error: 'Failed to retrieve search results.' });
    }
};


// --- Click Tracking for personalization ---
export const trackClick = async (req, res) => {
    const { userId, productId, category } = req.body;
    if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
    }

    try {
        // Existing: Update clicked products if productId provided
        if (productId) {
            await updateUserProfile(userId, productId);

            // NEW: Track categories from the clicked product (with safe fetch)
            let product;
            try {
                // Skip findById if productId looks like a PID (not 24 hex chars) to avoid CastError
                if (/^[0-9a-fA-F]{24}$/.test(productId)) {
                    product = await Product.findById(productId);
                }
                // Fallback to pid or id fields (your CSV-based identifiers)
                if (!product) {
                    product = await Product.findOne({
                        $or: [{ pid: productId }, { id: productId }]
                    });
                }
                if (!product) {
                    console.warn(`Product not found for ID/PID: ${productId} - Skipping category tracking`);
                }
            } catch (fetchError) {
                // Log but don't crash - continue without category tracking
                console.error(`Error fetching product ${productId}:`, fetchError.message);
            }

            if (product && (product.category || product.subcategory)) {
                const categories = [product.category, product.subcategory].filter(Boolean); // Get unique category/subcategory
                const profile = await getUserProfile(userId); // Reuse existing profile fetch
                profile.clicked_categories = profile.clicked_categories || [];
                
                // Add new categories to the front (for recency), remove duplicates, limit to 10
                categories.forEach(cat => {
                    profile.clicked_categories = profile.clicked_categories.filter(c => c !== cat);
                    profile.clicked_categories.unshift(cat);
                });
                profile.clicked_categories = profile.clicked_categories.slice(0, 10); // Limit history

                // NEW: Ensure client is connected before set
                if (!redisClient.isOpen) await redisClient.connect();
                await redisClient.set(`user:${userId}`, JSON.stringify(profile)); // Update Redis
                console.log(`User ${userId} clicked categories updated: ${categories}`);
            }
        }

        // NEW: Handle direct category/subcategory clicks (if category provided)
        if (category) {
            const profile = await getUserProfile(userId);
            profile.clicked_categories = profile.clicked_categories || [];
            
            // Add new category to the front (for recency), remove duplicates, limit to 10
            profile.clicked_categories = profile.clicked_categories.filter(c => c !== category);
            profile.clicked_categories.unshift(category);
            profile.clicked_categories = profile.clicked_categories.slice(0, 10); // Limit history

            // Ensure client is connected before set
            if (!redisClient.isOpen) await redisClient.connect();
            await redisClient.set(`user:${userId}`, JSON.stringify(profile)); // Update Redis
            console.log(`User ${userId} clicked category updated: ${category}`);
        }

        return res.status(200).json({ message: 'Click tracked successfully' });
    } catch (error) {
        console.error('trackClick error:', error);
        return res.status(500).json({ message: 'Failed to track click' });
    }
};

// --- Autosuggest for search bar: concise categories + product titles ---
export const autosuggest = async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json([]);
    
    const originalQuery = q.trim();
    const query = originalQuery.toLowerCase();
    
    // Existing abbreviation expansion logic (UNCHANGED)
    const expandedQuery = expandQueryWithAbbreviations(originalQuery);
    const searchQuery = expandedQuery !== originalQuery ? expandedQuery.toLowerCase() : query;

    // Existing personalization logic (UNCHANGED)
    let boostProducts = [];
    let boostCategories = []; 
    try {
        const userId = req.query.userId;
        if (userId) {
            const profile = await getUserProfile(userId);
            boostProducts = profile?.clicked_products || [];
            boostCategories = profile?.clicked_categories || [];
        }
    } catch (redisError) {
        console.error('Redis error in autosuggest:', redisError);
    }
    const boostWords = new Set();
    if (boostCategories.length > 0) {
        boostCategories.forEach(cat => {
            // Split phrases like "Men Formal Shoes" into individual words
            cat.toLowerCase().split(' ').forEach(word => boostWords.add(word));
        });
        // Now boostWords might contain: {'men', 'formal', 'shoes', 'disney', 'casual'}
    }


    try {
        // --- PRIMARY ELASTICSEARCH PATH ---
        const escapedQuery = escapeRegex(searchQuery);
        const escapedOriginalQuery = escapeRegex(query);

        // Existing Elasticsearch product search (UNCHANGED)
        const { hits } = await esClient.search({
            index: indexName,
            query: {
                bool: {
                    should: [
                        { multi_match: { query: searchQuery, fields: ['name^2', 'category'], fuzziness: 'AUTO', type: 'best_fields' } },
                        { multi_match: { query: query, fields: ['name^2', 'category'], fuzziness: 'AUTO', type: 'best_fields' } },
                        { terms: { _id: boostProducts } }
                    ]
                }
            },
            highlight: {
                fields: {
                    name: { pre_tags: ['<strong>'], post_tags: ['</strong>'] },
                    category: { pre_tags: ['<strong>'], post_tags: ['</strong>'] }
                }
            },
            sort: [{ rating: { order: 'desc' } }, '_score'],
            size: 5 // Reduced size to prioritize better category/term matches
        });

        // Existing product suggestion mapping and scoring (UNCHANGED)
        let productSuggestions = hits.hits.map(hit => {
            const nameLower = (hit._source.name || '').toLowerCase();
            const categoryLower = (hit._source.category || '').toLowerCase();
            let score = 0;
            if (boostProducts.includes(hit._id)) score += 1000;
            if (nameLower === searchQuery || nameLower === query) score += 900;
            else if (nameLower.startsWith(searchQuery) || nameLower.startsWith(query)) score += 500;
            else if (nameLower.includes(searchQuery) || nameLower.includes(query)) score += 100;
            if (categoryLower.startsWith(searchQuery) || categoryLower.startsWith(query)) score += 200;
            else if (categoryLower.includes(searchQuery) || categoryLower.includes(query)) score += 50;
            
            return {
                type: 'product',
                id: hit._id,
                title: {
                    longTitle: hit.highlight?.name?.[0] || hit._source.name,
                    shortTitle: hit.highlight?.category?.[0] || hit._source.category
                },
                rating: hit._source.rating,
                score
            };
        });

        // Category/Subcategory/Search-String suggestions from MongoDB
        try {
            const catMatches = await Category.find({
                $or: [
                    { category: { $regex: escapedQuery, $options: 'i' } },
                    { subcategory: { $regex: escapedQuery, $options: 'i' } },
                    { search_string: { $regex: escapedQuery, $options: 'i' } },
                    { category: { $regex: escapedOriginalQuery, $options: 'i' } },
                    { subcategory: { $regex: escapedOriginalQuery, $options: 'i' } },
                    { search_string: { $regex: escapedOriginalQuery, $options: 'i' } }
                ]
            }).limit(20);

            const cats = [];
            catMatches.forEach(c => {
                if (c.category && (c.category.toLowerCase().includes(searchQuery) || c.category.toLowerCase().includes(query)))
                    cats.push({ type: 'category', name: c.category });
                if (c.subcategory && (c.subcategory.toLowerCase().includes(searchQuery) || c.subcategory.toLowerCase().includes(query)))
                    cats.push({ type: 'subcategory', name: c.subcategory });
                if (c.search_string && (c.search_string.toLowerCase().includes(searchQuery) || c.search_string.toLowerCase().includes(query))) {
                    cats.push({ type: 'search_term', name: c.search_string, subcategory: c.subcategory });
                }
            });

            // --- ENHANCEMENT: Aggressive scoring to prioritize relevance over weak product matches ---
            let scoredCats = cats.map(cat => {
                const nameLower = cat.name.toLowerCase();
                let score = 0;
                const targetCat = cat.subcategory || cat.name;
                if (boostCategories.includes(targetCat)) score += 1000;
                if (boostWords.size > 0) {
                    const candidateWords = nameLower.split(' ');
                    let matchCount = 0;
                    candidateWords.forEach(word => {
                        if (boostWords.has(word)) {
                            matchCount++;
                        }
                    });
                    // Give a strong boost for each shared keyword found
                    if (matchCount > 0) {
                        score += 800 * matchCount;
                    }
                }
                // These scores are intentionally higher than product scores to ensure they rank first
                if (nameLower === query || nameLower === searchQuery) {
                    score += 2000; // Exact match is the best signal
                } else if (nameLower.startsWith(query) || nameLower.startsWith(searchQuery)) {
                    score += 1500; // Prefix match is very strong
                } else if (nameLower.includes(query) || nameLower.includes(searchQuery)) {
                    score += 100; // Contains match is a basic signal
                }
                
                // Add inherent boosts based on suggestion type specificity
                if (cat.type === 'search_term') score += 200;
                if (cat.type === 'subcategory') score += 150;

                return { ...cat, score };
            });

            // --- ENHANCEMENT: More robust combination logic ---
            const allSuggestions = [...productSuggestions, ...scoredCats];
            allSuggestions.sort((a,b) => (b.score || 0) - (a.score || 0));

            const finalSuggestions = [];
            const seenNames = new Set();
            for(const item of allSuggestions) {
                if(finalSuggestions.length >= 8) break;
                const key = item.type === 'product' ? item.id : item.name;
                if(!seenNames.has(key)) {
                    finalSuggestions.push(item);
                    seenNames.add(key);
                }
            }

            return res.json(finalSuggestions);

        } catch (mongoError) {
            console.error('Mongo category error in autosuggest:', mongoError);
            return res.json(productSuggestions.sort((a, b) => b.score - a.score).slice(0, 8)); // Fallback to just sorted products if Mongo fails
        }

    } catch (err) {
        // --- MONGODB FALLBACK PATH ---
        console.error('ES error in autosuggest, using Mongo fallback:', err.message);
        try {
            const escapedQuery = escapeRegex(searchQuery);
            const escapedOriginalQuery = escapeRegex(query);
            
            let products = await Product.find({
                $or: [
                    { 'title.longTitle': { $regex: escapedQuery, $options: 'i' } },
                    { 'title.shortTitle': { $regex: escapedQuery, $options: 'i' } },
                    { 'title.longTitle': { $regex: escapedOriginalQuery, $options: 'i' } },
                    { 'title.shortTitle': { $regex: escapedOriginalQuery, $options: 'i' } }
                ]
            }).sort({ rating: -1 }).limit(5);

            products = products.sort((a, b) => 
                (boostProducts.includes(b._id.toString()) ? 1 : 0) - (boostProducts.includes(a._id.toString()) ? 1 : 0)
            );

            // --- ENHANCEMENT: Added full scoring logic to fallback's product mapping ---
            let productSuggestions = products.map(p => {
                const longTitleLower = p.title.longTitle.toLowerCase();
                const shortTitleLower = p.title.shortTitle.toLowerCase();
                let score = 0;
                if (boostProducts.includes(p._id.toString())) score += 1000;
                if (longTitleLower === searchQuery || longTitleLower === query) score += 900;
                else if (longTitleLower.startsWith(searchQuery) || longTitleLower.startsWith(query)) score += 500;
                else if (longTitleLower.includes(searchQuery) || longTitleLower.includes(query)) score += 100;
                if (shortTitleLower.startsWith(searchQuery) || shortTitleLower.startsWith(query)) score += 200;
                else if (shortTitleLower.includes(searchQuery) || shortTitleLower.includes(query)) score += 50;
                
                const longTitle = p.title.longTitle.replace(new RegExp(escapedQuery, 'gi'), match => `<strong>${match}</strong>`);
                const shortTitle = p.title.shortTitle.replace(new RegExp(escapedQuery, 'gi'), match => `<strong>${match}</strong>`);
                
                return {
                    type: 'product', id: p._id.toString(), title: { longTitle, shortTitle }, rating: p.rating, score
                };
            });

            const catMatches = await Category.find({
                $or: [
                    { category: { $regex: escapedQuery, $options: 'i' } },
                    { subcategory: { $regex: escapedQuery, $options: 'i' } },
                    { search_string: { $regex: escapedQuery, $options: 'i' } },
                    { category: { $regex: escapedOriginalQuery, $options: 'i' } },
                    { subcategory: { $regex: escapedOriginalQuery, $options: 'i' } },
                    { search_string: { $regex: escapedOriginalQuery, $options: 'i' } }
                ]
            }).limit(20);
            
            const cats = [];
            catMatches.forEach(c => {
                if (c.category && (c.category.toLowerCase().includes(searchQuery) || c.category.toLowerCase().includes(query)))
                    cats.push({ type: 'category', name: c.category });
                if (c.subcategory && (c.subcategory.toLowerCase().includes(searchQuery) || c.subcategory.toLowerCase().includes(query)))
                    cats.push({ type: 'subcategory', name: c.subcategory });
                if (c.search_string && (c.search_string.toLowerCase().includes(searchQuery) || c.search_string.toLowerCase().includes(query))) {
                    cats.push({ type: 'search_term', name: c.search_string, subcategory: c.subcategory });
                }
            });

            // --- ENHANCEMENT: Mirrored aggressive scoring in the fallback path ---
            let scoredCats = cats.map(cat => {
                const nameLower = cat.name.toLowerCase();
                let score = 0;
                const targetCat = cat.subcategory || cat.name;
                if (boostCategories.includes(targetCat)) score += 1000;
                
                if (nameLower === query || nameLower === searchQuery) score += 2000;
                else if (nameLower.startsWith(query) || nameLower.startsWith(searchQuery)) score += 1500;
                else if (nameLower.includes(query) || nameLower.includes(searchQuery)) score += 100;
                
                if (cat.type === 'search_term') score += 200;
                if (cat.type === 'subcategory') score += 150;

                return { ...cat, score };
            });
            
            // Unchanged combination logic
            const allSuggestions = [...productSuggestions, ...scoredCats];
            allSuggestions.sort((a,b) => (b.score || 0) - (a.score || 0));

            const finalSuggestions = [];
            const seenNames = new Set();
            for(const item of allSuggestions) {
                if(finalSuggestions.length >= 8) break;
                const key = item.type === 'product' ? item.id : item.name;
                if(!seenNames.has(key)) {
                    finalSuggestions.push(item);
                    seenNames.add(key);
                }
            }
            
            return res.json(finalSuggestions);

        } catch (mongoError) {
            console.error('Mongo fallback error in autosuggest:', mongoError);
            return res.json([]);
        }
    }
};