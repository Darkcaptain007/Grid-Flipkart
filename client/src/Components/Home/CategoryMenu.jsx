import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  categoryRow: { /* your styles (horizontal, scrollable row) */ },
  categoryTab: { /* styles for each category tab */ },
  subcategoryDropdown: {
    position: 'absolute',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    borderRadius: '4px',
    padding: 8,
    marginTop: 8,
    zIndex: 1000,
    minWidth: 160,
  },
  subcategoryItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    '&:hover': { backgroundColor: '#f0f0f0' }
  }
}));

const CategoryMenu = () => {
  const classes = useStyles();
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    axios.get('/api/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error('Failed to fetch categories', err));
  }, []);

  const handleCategoryHover = (category) => {
    setHoveredCategory(category);
    axios.get(`/api/categories/${encodeURIComponent(category)}/subcategories`)
      .then(res => setSubcategories(res.data))
      .catch(err => {
        setSubcategories([]);
        console.error('Failed to fetch subcategories', err);
      });
  };

  const handleCategoryLeave = () => {
    setHoveredCategory(null);
    setSubcategories([]);
  };

  return (
    <Box className={classes.categoryRow}>
      {categories.map(cat => (
        <Box
          key={cat}
          className={classes.categoryTab}
          onMouseEnter={() => handleCategoryHover(cat)}
          onMouseLeave={handleCategoryLeave}
          style={{ position: 'relative' }}
        >
          <Typography>{cat}</Typography>

          {/* Subcategory dropdown */} 
          {hoveredCategory === cat && subcategories.length > 0 && (
            <Box className={classes.subcategoryDropdown}>
              {subcategories.map(sub => (
                <Typography key={sub} className={classes.subcategoryItem}>
                  {sub}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default CategoryMenu;
