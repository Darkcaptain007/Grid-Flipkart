import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Grid, 
    Typography, 
    makeStyles, 
    Card, 
    Chip,
    CircularProgress,
    FormControl,
    FormLabel,
    FormControlLabel,
    Checkbox,
    Slider,
    TextField,
    MenuItem,
    Select,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@material-ui/core';
import { useLocation, Link } from 'react-router-dom';
import { Star, ExpandMore } from '@material-ui/icons';
import axios from 'axios';

const useStyles = makeStyles(theme => ({
    container: {
        padding: '20px',
        background: '#f1f3f6',
        minHeight: '100vh',
        marginTop: 55
    },
    mainContent: {
        display: 'flex',
        gap: '20px'
    },
    filterSidebar: {
        width: '300px',
        background: '#fff',
        padding: '16px',
        borderRadius: '2px',
        alignSelf: 'flex-start',
        position: 'sticky',
        top: '75px',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto'
    },
    resultsContainer: {
        flex: 1
    },
    searchHeader: {
        background: '#fff',
        padding: '16px 24px',
        marginBottom: '12px',
        borderRadius: '2px',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,.1)'
    },
    resultsCount: {
        fontSize: '14px',
        color: '#878787'
    },
    searchTerm: {
        fontSize: '16px',
        fontWeight: 500,
        color: '#212121'
    },
    productCard: {
        background: '#fff',
        marginBottom: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        border: '1px solid #f0f0f0',
        '&:hover': {
            boxShadow: '0 2px 8px 0 rgba(0,0,0,.12)',
            transform: 'translateY(-1px)'
        }
    },
    productImage: {
        width: '200px',
        height: '200px',
        objectFit: 'contain',
        [theme.breakpoints.down('sm')]: {
            width: '150px',
            height: '150px'
        }
    },
    productDetails: {
        padding: '0 16px',
        flex: 1
    },
    productTitle: {
        fontSize: '16px',
        fontWeight: 400,
        color: '#212121',
        lineHeight: '1.4',
        marginBottom: '8px',
        display: '-webkit-box',
        '-webkit-line-clamp': 2,
        '-webkit-box-orient': 'vertical',
        overflow: 'hidden'
    },
    ratingContainer: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px'
    },
    rating: {
        background: '#388e3c',
        color: '#fff',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '12px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        marginRight: '8px'
    },
    priceContainer: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px'
    },
    currentPrice: {
        fontSize: '16px',
        fontWeight: 500,
        color: '#212121',
        marginRight: '8px'
    },
    originalPrice: {
        fontSize: '14px',
        color: '#878787',
        textDecoration: 'line-through',
        marginRight: '8px'
    },
    discount: {
        fontSize: '14px',
        color: '#388e3c',
        fontWeight: 500
    },
    features: {
        fontSize: '14px',
        color: '#878787',
        lineHeight: '1.4'
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '300px'
    },
    noResults: {
        textAlign: 'center',
        padding: '60px 20px',
        background: '#fff',
        borderRadius: '2px'
    },
    filterTitle: {
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '12px',
        color: '#212121'
    },
    priceSlider: {
        margin: '10px 0',
        color: '#2874f0'
    },
    priceInputs: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginTop: '10px'
    },
    priceInput: {
        width: '80px'
    },
    clearFilters: {
        marginTop: '20px',
        color: '#2874f0',
        borderColor: '#2874f0'
    },
    sortSelect: {
        minWidth: '200px',
        marginBottom: '16px'
    },
    sortContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    }
}));

const SearchResultsPage = () => {
    const classes = useStyles();
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter states
    const [priceRange, setPriceRange] = useState([0, 100000]);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [minRating, setMinRating] = useState(0);
    const [sortBy, setSortBy] = useState('relevance');

    // Available filter options
    const [availableBrands, setAvailableBrands] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);

    // Extract search query from URL parameters
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const query = urlParams.get('q') || '';
        setSearchTerm(query);

        if (query) {
            fetchSearchResults(query);
        }
    }, [location.search]);

    const fetchSearchResults = async (query) => {
        setLoading(true);
        try {
            const userId = '123';
            const { data } = await axios.get(`http://localhost:8000/search?q=${query}&userId=${userId}`);
            
            // Get full product details for each search result
            const detailedProducts = await Promise.all(
                data.map(async (item) => {
                    try {
                        const productResponse = await axios.get(`http://localhost:8000/product/${item.id}`);
                        return productResponse.data;
                    } catch (error) {
                        console.error(`Error fetching product ${item.id}:`, error);
                        return null;
                    }
                })
            );

            const validProducts = detailedProducts.filter(product => product !== null);
            setProducts(validProducts);
            setFilteredProducts(validProducts);

            // Extract unique brands and categories
            const brands = [...new Set(validProducts.map(p => p.brand).filter(Boolean))];
            const categories = [...new Set(validProducts.map(p => p.category).filter(Boolean))];
            setAvailableBrands(brands);
            setAvailableCategories(categories);

            // Set price range based on products
            const prices = validProducts.map(p => p.price?.cost || 0).filter(p => p > 0);
            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                setPriceRange([minPrice, maxPrice]);
            }

        } catch (error) {
            console.error('Error fetching search results:', error);
            setProducts([]);
            setFilteredProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters whenever filter states change
    useEffect(() => {
        applyFilters();
    }, [products, priceRange, selectedBrands, selectedCategories, minRating, sortBy]);

    const applyFilters = () => {
        let filtered = [...products];

        // Price filter
        filtered = filtered.filter(product => {
            const price = product.price?.cost || 0;
            return price >= priceRange[0] && price <= priceRange[1];
        });

        // Brand filter
        if (selectedBrands.length > 0) {
            filtered = filtered.filter(product => 
                selectedBrands.includes(product.brand)
            );
        }

        // Category filter
        if (selectedCategories.length > 0) {
            filtered = filtered.filter(product => 
                selectedCategories.includes(product.category)
            );
        }

        // Rating filter
        if (minRating > 0) {
            filtered = filtered.filter(product => 
                (product.rating || 0) >= minRating
            );
        }

        // Sort products
        switch (sortBy) {
            case 'price-low-high':
                filtered.sort((a, b) => (a.price?.cost || 0) - (b.price?.cost || 0));
                break;
            case 'price-high-low':
                filtered.sort((a, b) => (b.price?.cost || 0) - (a.price?.cost || 0));
                break;
            case 'rating':
                filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'discount':
                filtered.sort((a, b) => {
                    const discountA = parseFloat((a.price?.discount || '0%').replace('%', ''));
                    const discountB = parseFloat((b.price?.discount || '0%').replace('%', ''));
                    return discountB - discountA;
                });
                break;
            default:
                // Keep relevance order
                break;
        }

        setFilteredProducts(filtered);
    };

    const handleBrandChange = (brand) => {
        setSelectedBrands(prev => 
            prev.includes(brand) 
                ? prev.filter(b => b !== brand)
                : [...prev, brand]
        );
    };

    const handleCategoryChange = (category) => {
        setSelectedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const clearAllFilters = () => {
        setPriceRange([0, 100000]);
        setSelectedBrands([]);
        setSelectedCategories([]);
        setMinRating(0);
        setSortBy('relevance');
    };

    const handleProductClick = async (productId) => {
        try {
            await axios.post('http://localhost:8000/click', {
                userId: '123',
                productId: productId
            });
        } catch (error) {
            console.error('Error tracking click:', error);
        }
    };

    if (loading) {
        return (
            <Box className={classes.container}>
                <Box className={classes.loadingContainer}>
                    <CircularProgress />
                </Box>
            </Box>
        );
    }

    return (
        <Box className={classes.container}>
            <Box className={classes.mainContent}>
                {/* Filter Sidebar */}
                <Box className={classes.filterSidebar}>
                    <Typography className={classes.filterTitle}>
                        FILTERS
                    </Typography>

                    <Button 
                        variant="outlined" 
                        size="small" 
                        className={classes.clearFilters}
                        onClick={clearAllFilters}
                    >
                        Clear All Filters
                    </Button>

                    {/* Price Filter */}
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography className={classes.filterTitle}>PRICE</Typography>
                        </AccordionSummary>
                        <AccordionDetails style={{ flexDirection: 'column' }}>
                            <Slider
                                value={priceRange}
                                onChange={(_, newValue) => setPriceRange(newValue)}
                                valueLabelDisplay="auto"
                                min={0}
                                max={100000}
                                className={classes.priceSlider}
                                valueLabelFormat={(value) => `₹${value.toLocaleString()}`}
                            />
                            <Box className={classes.priceInputs}>
                                <TextField
                                    size="small"
                                    label="Min"
                                    type="number"
                                    value={priceRange[0]}
                                    onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                                    className={classes.priceInput}
                                />
                                <Typography>to</Typography>
                                <TextField
                                    size="small"
                                    label="Max"
                                    type="number"
                                    value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 100000])}
                                    className={classes.priceInput}
                                />
                            </Box>
                        </AccordionDetails>
                    </Accordion>

                    {/* Brand Filter */}
                    {availableBrands.length > 0 && (
                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography className={classes.filterTitle}>BRAND</Typography>
                            </AccordionSummary>
                            <AccordionDetails style={{ flexDirection: 'column' }}>
                                <FormControl component="fieldset">
                                    {availableBrands.map(brand => (
                                        <FormControlLabel
                                            key={brand}
                                            control={
                                                <Checkbox
                                                    checked={selectedBrands.includes(brand)}
                                                    onChange={() => handleBrandChange(brand)}
                                                    size="small"
                                                />
                                            }
                                            label={brand}
                                        />
                                    ))}
                                </FormControl>
                            </AccordionDetails>
                        </Accordion>
                    )}

                    {/* Category Filter */}
                    {availableCategories.length > 0 && (
                        <Accordion defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <Typography className={classes.filterTitle}>CATEGORY</Typography>
                            </AccordionSummary>
                            <AccordionDetails style={{ flexDirection: 'column' }}>
                                <FormControl component="fieldset">
                                    {availableCategories.map(category => (
                                        <FormControlLabel
                                            key={category}
                                            control={
                                                <Checkbox
                                                    checked={selectedCategories.includes(category)}
                                                    onChange={() => handleCategoryChange(category)}
                                                    size="small"
                                                />
                                            }
                                            label={category}
                                        />
                                    ))}
                                </FormControl>
                            </AccordionDetails>
                        </Accordion>
                    )}

                    {/* Rating Filter */}
                    <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography className={classes.filterTitle}>CUSTOMER RATING</Typography>
                        </AccordionSummary>
                        <AccordionDetails style={{ flexDirection: 'column' }}>
                            <FormControl component="fieldset">
                                {[4, 3, 2, 1].map(rating => (
                                    <FormControlLabel
                                        key={rating}
                                        control={
                                            <Checkbox
                                                checked={minRating === rating}
                                                onChange={() => setMinRating(minRating === rating ? 0 : rating)}
                                                size="small"
                                            />
                                        }
                                        label={`${rating}★ & above`}
                                    />
                                ))}
                            </FormControl>
                        </AccordionDetails>
                    </Accordion>
                </Box>

                {/* Results Container */}
                <Box className={classes.resultsContainer}>
                    {/* Search Header */}
                    <Box className={classes.searchHeader}>
                        <Box className={classes.sortContainer}>
                            <Box>
                                <Typography className={classes.searchTerm}>
                                    Search results for "{searchTerm}"
                                </Typography>
                                <Typography className={classes.resultsCount}>
                                    {filteredProducts.length} results found
                                </Typography>
                            </Box>
                            <FormControl size="small" className={classes.sortSelect}>
                                <Select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="relevance">Sort by Relevance</MenuItem>
                                    <MenuItem value="price-low-high">Price: Low to High</MenuItem>
                                    <MenuItem value="price-high-low">Price: High to Low</MenuItem>
                                    <MenuItem value="rating">Customer Rating</MenuItem>
                                    <MenuItem value="discount">Discount</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>

                    {/* Active Filters */}
                    {(selectedBrands.length > 0 || selectedCategories.length > 0 || minRating > 0) && (
                        <Box style={{ marginBottom: '12px' }}>
                            {selectedBrands.map(brand => (
                                <Chip
                                    key={brand}
                                    label={`Brand: ${brand}`}
                                    onDelete={() => handleBrandChange(brand)}
                                    style={{ margin: '4px' }}
                                    size="small"
                                />
                            ))}
                            {selectedCategories.map(category => (
                                <Chip
                                    key={category}
                                    label={`Category: ${category}`}
                                    onDelete={() => handleCategoryChange(category)}
                                    style={{ margin: '4px' }}
                                    size="small"
                                />
                            ))}
                            {minRating > 0 && (
                                <Chip
                                    label={`Rating: ${minRating}★ & above`}
                                    onDelete={() => setMinRating(0)}
                                    style={{ margin: '4px' }}
                                    size="small"
                                />
                            )}
                        </Box>
                    )}

                    {/* Search Results */}
                    {filteredProducts.length > 0 ? (
                        <Grid container spacing={0}>
                            {filteredProducts.map((product) => (
                                <Grid item xs={12} key={product.id || product._id}>
                                    <Link 
                                        to={`/product/${product.id || product._id}`} 
                                        style={{ textDecoration: 'none' }}
                                        onClick={() => handleProductClick(product.id || product._id)}
                                    >
                                        <Card className={classes.productCard} elevation={0}>
                                            <Box display="flex">
                                                {/* Product Image */}
                                                <Box>
                                                    <img 
                                                        src={product.url} 
                                                        alt={product.title?.longTitle}
                                                        className={classes.productImage}
                                                    />
                                                </Box>

                                                {/* Product Details */}
                                                <Box className={classes.productDetails}>
                                                    <Typography className={classes.productTitle}>
                                                        {product.title?.longTitle}
                                                    </Typography>

                                                    {/* Rating */}
                                                    <Box className={classes.ratingContainer}>
                                                        <Box className={classes.rating}>
                                                            <Star style={{ fontSize: '12px', marginRight: '2px' }} />
                                                            {product.rating || 4.2}
                                                        </Box>
                                                        <Typography className={classes.reviewCount}>
                                                            (1,234 reviews)
                                                        </Typography>
                                                    </Box>

                                                    {/* Price */}
                                                    <Box className={classes.priceContainer}>
                                                        <Typography className={classes.currentPrice}>
                                                            ₹{product.price?.cost?.toLocaleString('en-IN')}
                                                        </Typography>
                                                        <Typography className={classes.originalPrice}>
                                                            ₹{product.price?.mrp?.toLocaleString('en-IN')}
                                                        </Typography>
                                                        <Typography className={classes.discount}>
                                                            {product.price?.discount} off
                                                        </Typography>
                                                    </Box>

                                                    {/* Features */}
                                                    <Typography className={classes.features}>
                                                        {product.description ? 
                                                            product.description.substring(0, 150) + '...' : 
                                                            'No description available'
                                                        }
                                                    </Typography>

                                                    {/* Brand */}
                                                    {product.brand && (
                                                        <Box mt={1}>
                                                            <Chip 
                                                                label={product.brand} 
                                                                size="small" 
                                                                style={{ 
                                                                    background: '#e3f2fd', 
                                                                    color: '#1976d2',
                                                                    fontSize: '11px'
                                                                }} 
                                                            />
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Card>
                                    </Link>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Box className={classes.noResults}>
                            <Typography variant="h6" gutterBottom>
                                No products found
                            </Typography>
                            <Typography color="textSecondary">
                                Try adjusting your search terms or filters
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default SearchResultsPage;
