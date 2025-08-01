import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    id: String,
    pid: String,
    url: String,
    detailUrl: String,
    title: Object,
    price: Object,
    quantity: Number,
    description: String,
    discount: String,
    tagline: String,
    brand: String,          // For brand filtering
    category: String,       // For category filtering
    subcategory: String,
    rating: Number,         // For rating filtering
    specifications: String,
    product_category_tree: String, // You can keep this if you want hierarchy

});
productSchema.index({ id: 1, pid: 1, category: 1, brand: 1 });
const products = mongoose.model('product', productSchema);

export default products;
