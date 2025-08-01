import Product from '../model/productSchema.js';

// Get all unique categories
export const getCategories = async (req, res) => {
  const categories = await Product.distinct('category');
  res.json(categories);
};

// Get all unique subcategories for a category
export const getSubcategories = async (req, res) => {
  const subcategories = await Product.distinct('subcategory', { category: req.params.category });
  res.json(subcategories);
};

// Recommend top N products from a category/subcategory (could sort by rating/popularity)
export const getCategoryRecommendations = async (req, res) => {
  const { category } = req.params;
  const products = await Product.find({ category }).sort({ product_rating: -1 }).limit(8);
  res.json(products);
};
