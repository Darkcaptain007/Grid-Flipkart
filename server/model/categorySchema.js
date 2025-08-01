import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  category: { type: String, trim: true },
  subcategory: { type: String, trim: true }
});

export default mongoose.model('Category', categorySchema);
