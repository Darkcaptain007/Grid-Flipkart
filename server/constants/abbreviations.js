// server/constants/abbreviations.js
export const abbreviationMap = {
  // Electronics & Appliances
  'tv': 'Televisions',
  'television': 'Televisions',
  'ac': 'Air Conditioners',
  'airconditioner': 'Air Conditioners',
  'aircon': 'Air Conditioners',
  'wm': 'Washing Machines',
  'washingmachine': 'Washing Machines',
  'mwo': 'Microwave Ovens',
  'microwave': 'Microwave Ovens',
  'mjg': 'Mixer Juicer Grinder',
  'otg': 'Oven Toaster Grills',
  'ro': 'Water purifiers',
  'uv': 'Water purifiers',
  'uf': 'Water purifiers',
  'hdd': 'External HDD',
  'ssd': 'External HDD',
  
  // Cameras
  'dslr': 'DSLR & Mirrorless',
  'mirrorless': 'DSLR & Mirrorless',
  'camera': 'DSLR & Mirrorless',
  
  // Networking
  'wifi': 'Routers',
  'router': 'Routers',
  
  // Gaming
  'rc': 'Remote Control Toys',
  'remotecontrol': 'Remote Control Toys',
  
  // Beauty & Care
  'spf': 'Body and Face Care',
  'skincare': 'Body and Face Care',
  'bodycare': 'Body and Face Care',
  
  // Audio
  'tws': 'True Wireless',
  'earbuds': 'True Wireless',
  'headphones': 'True Wireless',
  
  // Sports & Fitness
  'mtb': 'Cycles',
  'bicycle': 'Cycles',
  'bike': 'Cycles',
  
  // Fragrance
  'perfume': 'Perfume',
  'cologne': 'Perfume',
  'fragrance': 'Perfume',
  
  // Supplements
  'protein': 'Protein Supplement',
  'whey': 'Protein Supplement',
  
  // Automotive
  'car': 'Automotive Accessories',
  'auto': 'Automotive Accessories',
  
  // Lighting
  'led': 'Decor lighting & Accessories',
  'bulb': 'Decor lighting & Accessories',
  'light': 'Decor lighting & Accessories',
  
  // Technology
  'ai': 'Automation & Robotics',
  'ml': 'Automation & Robotics',
  'iot': 'Automation & Robotics',
  'smart': 'Automation & Robotics'
};

// Function to expand query with abbreviations
export function expandQueryWithAbbreviations(query) {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check for exact match first
  if (abbreviationMap[normalizedQuery]) {
    return abbreviationMap[normalizedQuery];
  }
  
  // Check for partial matches in multi-word queries
  const words = normalizedQuery.split(/\s+/);
  const expandedWords = words.map(word => {
    return abbreviationMap[word] || word;
  });
  
  // If any word was expanded, return the expanded version
  if (expandedWords.some((word, index) => word !== words[index])) {
    return expandedWords.join(' ');
  }
  
  return query; // Return original if no abbreviation found
}
