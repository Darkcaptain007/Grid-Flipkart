import * as actionTypes from '../constants/productConstant';
import axios from 'axios';

export const getProducts = () => async (dispatch) => {
    try {
        console.log('Fetching products...')
        const { data } = await axios.get(`http://localhost:8000/products`);
        
        // Add id field to each product for consistency
        const productsWithId = data.map(product => ({
            ...product,
            id: product.id || product._id // Use existing id or fallback to _id
        }));
        
        dispatch({ type: actionTypes.GET_PRODUCTS_SUCCESS, payload: productsWithId });
    } catch (error) {
        dispatch({ type: actionTypes.GET_PRODUCTS_FAIL, payload: error.response });
    }
};

export const getProductDetails = (id) => async (dispatch) => {
    try {
        dispatch({ type: actionTypes.GET_PRODUCT_DETAILS_REQUEST });
        console.log('Fetching product details for ID:', id);
        
        const { data } = await axios.get(`http://localhost:8000/product/${id}`);
        console.log('Product details response:', data);

        if (data) {
            // Ensure the product has an id field
            const productWithId = {
                ...data,
                id: data.id || data._id
            };
            dispatch({ type: actionTypes.GET_PRODUCT_DETAILS_SUCCESS, payload: productWithId });
        } else {
            dispatch({ type: actionTypes.GET_PRODUCT_DETAILS_FAIL, payload: 'Product not found' });
        }
    } catch (error) {
        console.error('Error fetching product details:', error);
        dispatch({ type: actionTypes.GET_PRODUCT_DETAILS_FAIL, payload: error.response?.data || error.message});
    }
};
