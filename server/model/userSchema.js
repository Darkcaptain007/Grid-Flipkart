import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    firstname: { type: String, required: true, trim: true, max: 20 },
    lastname: { type: String, required: true, trim: true, max: 20 },
    username: { type: String, required: true, trim: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    recentSearches: { type: [String], default: [] },
    recentCart: { type: [Object], default: [] },
    recentPurchases: { type: [Object], default: [] }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
