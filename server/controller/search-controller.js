import Product from '../model/productSchema.js';
import Category from '../model/categorySchema.js';
import { esClient } from '../index.js';
import { updateUserProfile, getUserProfile, redisClient } from '../database/redis.js';


const indexName = 'products';


// UPDATED: Enhanced regex escape to handle trailing/invalid backslashes (double-escape '\')
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').replace(/\\/g, '\\\\');
}


// --- Personalized Search Controller: Returns ranked products + category suggestions ---
export const personalizedSearch = async (req, res) => {
    const { q: searchQuery, userId } = req.query;
    if (!searchQuery) {
        return res.status(400).send('Query "q" is required.');
    }


    // UserId is optional; if missing, proceed without personalization
    let boostProducts = [];
    try {
        if (userId) {
            const profile = await getUserProfile(userId);
            boostProducts = profile?.clicked_products || [];
        }
    } catch (redisError) {
        console.error('Redis error in personalizedSearch:', redisError);
        // Continue without boosting
    }


    try {
        let productResults = [];
        let categorySuggestions = [];


        // --- Product Search: Elasticsearch, Fallback to Mongo ---
        try {
            // ES - match on product name + category, allow typos, with boosting and highlighting
            const { hits } = await esClient.search({
                index: indexName,
                query: {
                    bool: {  // Use bool for boosting
                        should: [
                            {
                                multi_match: {
                                    query: searchQuery,
                                    fields: ['name^2', 'name._2gram', 'name._3gram', 'category'],
                                    fuzziness: 'AUTO',
                                    type: 'best_fields'
                                }
                            },
                            {
                                terms: { _id: boostProducts } // Boost user's clicked products
                            }
                        ]
                    }
                },
                highlight: {
                    fields: {
                        name: { pre_tags: ['<strong>'], post_tags: ['</strong>'] },
                        category: { pre_tags: ['<strong>'], post_tags: ['</strong>'] }
                    }
                },
                sort: [{ rating: { order: 'desc' } }, '_score'], // Sort by rating + relevance
                size: 20
            });
            productResults = hits.hits.map(hit => ({
                id: hit._id,
                title: {
                    longTitle: hit.highlight?.name?.[0] || hit._source.name, // Highlighted
                    shortTitle: hit.highlight?.category?.[0] || hit._source.category
                },
                score: hit._score,
                rating: hit._source.rating,
                type: 'product'
            }));
        } catch (esError) {
            console.error('ES error in personalizedSearch:', esError);
            // Mongo Fallback (case-insensitive substring, with basic boosting)
            try {
                const escapedQuery = escapeRegex(searchQuery);
                let products = await Product.find({
                    $or: [
                        { 'title.longTitle': { $regex: escapedQuery, $options: 'i' } },
                        { 'title.shortTitle': { $regex: escapedQuery, $options: 'i' } },
                        { description: { $regex: escapedQuery, $options: 'i' } }
                    ]
                }).sort({ rating: -1 }).limit(20); // Sort by rating descending


                // Basic boosting: Move clicked products to top
                products = products.sort((a, b) => 
                    (boostProducts.includes(b._id.toString()) ? 1 : 0) - (boostProducts.includes(a._id.toString()) ? 1 : 0)
                );


                // Pseudo-highlighting: Wrap matched terms
                productResults = products.map(product => {
                    const longTitle = product.title.longTitle.replace(
                        new RegExp(escapedQuery, 'gi'), 
                        match => `<strong>${match}</strong>`
                    );
                    const shortTitle = product.title.shortTitle.replace(
                        new RegExp(escapedQuery, 'gi'), 
                        match => `<strong>${match}</strong>`
                    );
                    return {
                        id: product._id.toString(),
                        title: { longTitle, shortTitle },
                        rating: product.rating,
                        type: 'product'
                    };
                });
            } catch (mongoError) {
                console.error('Mongo fallback error in personalizedSearch:', mongoError);
                productResults = []; // Graceful fallback: empty results
            }
        }


        // --- Category/Subcategory Suggestions (de-duped, both fields) ---
        try {
            const escapedQuery = escapeRegex(searchQuery);
            const catMatches = await Category.find({
                $or: [
                    { category: { $regex: escapedQuery, $options: 'i' } },
                    { subcategory: { $regex: escapedQuery, $options: 'i' } }
                ]
            }).limit(10);
            const catSet = new Set();
            catMatches.forEach(c => {
                if (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()))
                    catSet.add(JSON.stringify({ type: 'category', name: c.category }));
                if (c.subcategory && c.subcategory.toLowerCase().includes(searchQuery.toLowerCase()))
                    catSet.add(JSON.stringify({ type: 'subcategory', name: c.subcategory }));
            });
            let categories = Array.from(catSet).map(s => JSON.parse(s));


            // Sort by exact match and limit to top 5 for full search
            categories = categories.sort((a, b) => {
                const aMatch = a.name.toLowerCase() === searchQuery.toLowerCase() ? 1 : 0;
                const bMatch = b.name.toLowerCase() === searchQuery.toLowerCase() ? 1 : 0;
                return bMatch - aMatch;
            }).slice(0, 5);


            categorySuggestions = categories;
        } catch (mongoError) {
            console.error('Mongo category error in personalizedSearch:', mongoError);
            categorySuggestions = []; // Graceful fallback
        }


        // --- Compose: category suggestions on top, then product results ---
        const combinedResults = [...categorySuggestions, ...productResults].slice(0, 20);
        res.json(combinedResults);
    } catch (error) {
        console.error('Search controller error:', error);
        res.status(500).json({ error: 'Something went wrong during search.' });
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
    const query = q.trim().toLowerCase();


    // UserId is optional
    let boostProducts = [];
    let boostCategories = []; // NEW: For category boosting
    try {
        const userId = req.query.userId;
        if (userId) {
            const profile = await getUserProfile(userId);
            boostProducts = profile?.clicked_products || [];
            boostCategories = profile?.clicked_categories || []; // Fetch clicked categories
        }
    } catch (redisError) {
        console.error('Redis error in autosuggest:', redisError);
        // Continue without boosting
    }


    try {
        const escapedQuery = escapeRegex(query);


        // Elasticsearch: for product name and category, with boosting, highlighting, and sorting by rating
        const { hits } = await esClient.search({
            index: indexName,
            query: {
                bool: {  // Use bool query for boosting
                    should: [
                        {
                            multi_match: {
                                query,
                                fields: ['name^2', 'category'],
                                fuzziness: 'AUTO',
                                type: 'best_fields'
                            }
                        },
                        {
                            terms: { _id: boostProducts } // Boost user's clicked products
                        }
                    ]
                }
            },
            highlight: {
                fields: {
                    name: { pre_tags: ['<strong>'], post_tags: ['</strong>'] },
                    category: { pre_tags: ['<strong>'], post_tags: ['</strong>'] }
                }
            },
            sort: [{ rating: { order: 'desc' } }, '_score'], // Combine rating with relevance score
            size: 8
        });


        let productSuggestions = hits.hits.map(hit => {
            const nameLower = (hit._source.name || '').toLowerCase();
            const categoryLower = (hit._source.category || '').toLowerCase();
            let score = 0;
            
            // Personalized boost (only for products)
            if (boostProducts.includes(hit._id)) score += 1000;
            
            // Exact match
            if (nameLower === query) score += 900;
            else if (nameLower.startsWith(query)) score += 500;
            else if (nameLower.includes(query)) score += 100;
            
            // Additional for category
            if (categoryLower.startsWith(query)) score += 200;
            else if (categoryLower.includes(query)) score += 50;
            
            return {
                type: 'product',
                id: hit._id,
                title: {
                    longTitle: hit.highlight?.name?.[0] || hit._source.name, // Use highlighted if available
                    shortTitle: hit.highlight?.category?.[0] || hit._source.category
                },
                rating: hit._source.rating, // Include rating for debugging if needed
                score
            };
        });


        // Sort products by score descending
        productSuggestions.sort((a, b) => b.score - a.score);


        // Category/Subcategory suggestions - REMOVED LIMIT to get ALL matches, then sort/boost
        try {
            const catMatches = await Category.find({
                $or: [
                    { category: { $regex: escapedQuery, $options: 'i' } },
                    { subcategory: { $regex: escapedQuery, $options: 'i' } }
                ]
            }); // No limit here - fetch all potential matches


            const cats = [];
            catMatches.forEach(c => {
                if (c.category && c.category.toLowerCase().includes(query))
                    cats.push({ type: 'category', name: c.category });
                if (c.subcategory && c.subcategory.toLowerCase().includes(query))
                    cats.push({ type: 'subcategory', name: c.subcategory });
            });


            // UPDATED: Apply scoring for categories
            let scoredCats = cats.map(cat => {
                const nameLower = cat.name.toLowerCase();
                let score = 0;
                
                // Personalized boost
                if (boostCategories.includes(cat.name)) score += 1000;
                
                // Exact match
                if (nameLower === query) score += 900;
                
                // Prefix boost
                if (nameLower.startsWith(query)) score += 500;
                
                // Substring match but not prefix
                else if (nameLower.includes(query)) score += 100;
                
                return { ...cat, score };
            });


            // Sort by score descending
            scoredCats.sort((a, b) => b.score - a.score);


            const categories = Array.from(new Set(scoredCats.map(x => JSON.stringify({ type: x.type, name: x.name })))).map(x => JSON.parse(x)).slice(0, 3); // Limit to top 3 AFTER sorting


            // Combine, keeping categories above products, max 8 total
            const finalSuggestions = [...categories, ...productSuggestions.slice(0, 5)].slice(0, 8);
            return res.json(finalSuggestions);
        } catch (mongoError) {
            console.error('Mongo category error in autosuggest:', mongoError);
            return res.json([]); // Graceful fallback
        }
    } catch (err) {
        console.error('ES error in autosuggest:', err);
        // MongoDB fallback: similar logic, sorted by rating descending
        try {
            const escapedQuery = escapeRegex(query);
            let products = await Product.find({
                $or: [
                    { 'title.longTitle': { $regex: escapedQuery, $options: 'i' } },
                    { 'title.shortTitle': { $regex: escapedQuery, $options: 'i' } }
                ]
            }).sort({ rating: -1 }) // Sort by rating descending
              .limit(5); // Limit to top 5 highest-rated


            // Basic boosting: Move clicked products to top
            products = products.sort((a, b) => 
                (boostProducts.includes(b._id.toString()) ? 1 : 0) - (boostProducts.includes(a._id.toString()) ? 1 : 0)
            );


            // Pseudo-highlighting: Wrap matched terms
            let productSuggestions = products.map(p => {
                const longTitleLower = p.title.longTitle.toLowerCase();
                const shortTitleLower = p.title.shortTitle.toLowerCase();
                let score = 0;
                
                // Personalized boost
                if (boostProducts.includes(p._id.toString())) score += 1000;
                
                // Exact match on longTitle
                if (longTitleLower === query) score += 900;
                else if (longTitleLower.startsWith(query)) score += 500;
                else if (longTitleLower.includes(query)) score += 100;
                
                // Additional for shortTitle
                if (shortTitleLower.startsWith(query)) score += 200;
                else if (shortTitleLower.includes(query)) score += 50;
                
                const longTitle = p.title.longTitle.replace(
                    new RegExp(escapedQuery, 'gi'), 
                    match => `<strong>${match}</strong>`
                );
                const shortTitle = p.title.shortTitle.replace(
                    new RegExp(escapedQuery, 'gi'), 
                    match => `<strong>${match}</strong>`
                );
                return {
                    type: 'product',
                    id: p._id.toString(),
                    title: { longTitle, shortTitle },
                    rating: p.rating, // Include rating for debugging if needed
                    score
                };
            });


            // Sort products by score descending
            productSuggestions.sort((a, b) => b.score - a.score);


            const catMatches = await Category.find({
                $or: [
                    { category: { $regex: escapedQuery, $options: 'i' } },
                    { subcategory: { $regex: escapedQuery, $options: 'i' } }
                ]
            }); // No limit
            const cats = [];
            catMatches.forEach(c => {
                if (c.category && c.category.toLowerCase().includes(query))
                    cats.push({ type: 'category', name: c.category });
                if (c.subcategory && c.subcategory.toLowerCase().includes(query))
                    cats.push({ type: 'subcategory', name: c.subcategory });
            });


            // Apply scoring for categories
            let scoredCats = cats.map(cat => {
                const nameLower = cat.name.toLowerCase();
                let score = 0;
                
                // Personalized boost
                if (boostCategories.includes(cat.name)) score += 1000;
                
                // Exact match
                if (nameLower === query) score += 900;
                
                // Prefix boost
                if (nameLower.startsWith(query)) score += 500;
                
                // Substring match but not prefix
                else if (nameLower.includes(query)) score += 100;
                
                return { ...cat, score };
            });


            // Sort by score descending
            scoredCats.sort((a, b) => b.score - a.score);


            const categories = Array.from(new Set(scoredCats.map(x => JSON.stringify({ type: x.type, name: x.name })))).map(x => JSON.parse(x)).slice(0, 3); // Limit to top 3 AFTER sorting


            const final = [...categories, ...productSuggestions].slice(0, 8);
            return res.json(final);
        } catch (mongoError) {
            console.error('Mongo fallback error in autosuggest:', mongoError);
            return res.json([]); // Graceful fallback
        }
    }
};
