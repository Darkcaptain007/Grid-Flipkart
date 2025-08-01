// utils/userHistory.js
import User from '../model/userSchema.js';

// Call this on cart change
export async function updateRecentCart(userId, cartSnapshot) {
  const user = await User.findById(userId);
  user.recentCart.unshift(cartSnapshot);
  user.recentCart = user.recentCart.slice(0, 15);
  await user.save();
}

// Call this on every search
export async function updateRecentSearches(userId, searchQuery) {
  const user = await User.findById(userId);
  // Remove duplicates
  user.recentSearches = user.recentSearches.filter(q => q !== searchQuery);
  user.recentSearches.unshift(searchQuery);
  user.recentSearches = user.recentSearches.slice(0, 15);
  await user.save();
}

// Call this after purchase completed
export async function updateRecentPurchases(userId, productObj) {
  const user = await User.findById(userId);
  user.recentPurchases.unshift(productObj);
  user.recentPurchases = user.recentPurchases.slice(0, 15);
  await user.save();
}
