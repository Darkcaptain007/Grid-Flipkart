import { Box, makeStyles } from '@material-ui/core';
import { useHistory } from 'react-router-dom';
import NavBar from './Home/NarBar'; // Corrected import name
import Banner from './Home/Banner';
import MidSlide from './Home/MidSlide';
import MidSection from './Home/MidSection';
import Slide from './Home/Slide';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux'; // hooks
import { getProducts as listProducts } from '../redux/actions/productActions';
import CategoryMenu from "./Home/CategoryMenu";

// --- UI ENHANCEMENT: Styles updated for new layout and background color ---
const useStyle = makeStyles({
    // This wrapper is the new top-level container after the header
    homeWrapper: {
        marginTop: 55, // Clears the fixed header
    },
    // This component now only controls the main content area below the nav
    component: {
        padding: 10,
        background: '#F1F3F6' // This is the light grey background color from Flipkart
    }
});

const Home = () => {
    const classes = useStyle();

    // --- All your existing logic is preserved ---
    const getProducts = useSelector(state => state.getProducts);
    const { products } = getProducts;

    const dispatch = useDispatch();
    const history = useHistory();

    const handleCategoryClick = (cat) => {
        history.push(`/search?q=${encodeURIComponent(cat)}`);
    };

    useEffect(() => {
        dispatch(listProducts())
    }, [dispatch]);

    return (
        // --- UI ENHANCEMENT: The Fragment <> is replaced with the new wrapper Box ---
        <Box className={classes.homeWrapper}> 
            <NavBar />
            {/* 
              Note: The original Flipkart doesn't have a second category menu here.
              You can choose to keep or remove this based on your desired UI.
              I'm keeping it as you had it.
            */}
            <CategoryMenu onCategoryClick={handleCategoryClick} />
            
            <Box className={classes.component}>
                <Banner />
                <MidSlide products={products} />
                <MidSection />
                <Slide
                    data={products} 
                    title='Discounts for You'
                    timer={false} 
                    multi={true} 
                />
                <Slide
                    data={products} 
                    title='Suggested Items'
                    timer={false} 
                    multi={true} 
                />
                <Slide
                    data={products} 
                    title='Top Selection'
                    timer={false} 
                    multi={true} 
                />
                <Slide
                    data={products} 
                    title='Recommended Items'
                    timer={false} 
                    multi={true} 
                />
            </Box>
        </Box>
    )
}

export default Home;