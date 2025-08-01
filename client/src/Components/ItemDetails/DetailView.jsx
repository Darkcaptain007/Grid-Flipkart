import { useEffect } from 'react';
import { Box, Grid, makeStyles, Typography } from '@material-ui/core';
import { LocalOffer as Badge } from '@material-ui/icons';
import ProductDetail from './ProductDetail';
import ActionItem from './ActionItem';
import { useDispatch, useSelector } from 'react-redux';
import { getProductDetails } from '../../redux/actions/productActions';

const useStyles = makeStyles(theme => ({
    component: {
        marginTop: 55,
        background: '#F2F2F2'
    },
    container: {
        background: '#FFFFFF',
        margin: '0 80px',
        display: 'flex',
        [theme.breakpoints.down('md')]: {
            margin: 0
        }
    },
    rightContainer: {
        marginTop: 50,
        padding: '0 25px',
        '& > *': {
            marginTop: 10
        }
    },
    price: {
        fontSize: 28
    },
    smallText: {
        fontSize: 14,
    },
    greyTextColor: {
        color: '#878787'
    },
    badge: {
        marginRight: 10,
        color: '#00CC00',
        fontSize: 15
    }
}));

const DetailView = ({ match }) => {
    const classes = useStyles();
    const fassured = 'https://static-assets-web.flixcart.com/www/linchpin/fk-cp-zion/img/fa_62673a.png';
    
    // Get product data and loading status from Redux store
    const { loading, product } = useSelector(state => state.getProductDetails);
    const dispatch = useDispatch();
    
    useEffect(() => {
        if (match.params.id) {
            dispatch(getProductDetails(match.params.id));
        }
        console.log('DetailView looking for ID:', match.params.id);

    }, [dispatch, match.params.id]);

    console.log('Product data:', product); // Debug log
    console.log('Loading:', loading); // Debug log

    if (loading) {
        return (
            <Box className={classes.component}>
                <Typography style={{ padding: '50px', textAlign: 'center' }}>Loading...</Typography>
            </Box>
        );
    }

    if (!product || !Object.keys(product).length) {
        return (
            <Box className={classes.component}>
                <Typography style={{ padding: '50px', textAlign: 'center' }}>Product not found</Typography>
            </Box>
        );
    }

    return (
        <Box className={classes.component}>
            <Grid container className={classes.container}>
                <Grid item lg={4} md={4} sm={8} xs={12}>
                    <ActionItem product={product} />
                </Grid>
                <Grid item lg={8} md={8} sm={8} xs={12} className={classes.rightContainer}>
                    <Typography>{product.title?.longTitle || 'Product Title'}</Typography>
                    
                    <Typography style={{marginTop: 5, color: '#878787', fontSize: 14}}>
                        8 Ratings & 1 Reviews
                        <span><img src={fassured} style={{width: 77, marginLeft: 20}} alt="" /></span>
                    </Typography>
                    
                    <Typography>
                        <span className={classes.price}>₹{product.price?.cost}</span>&nbsp;&nbsp;&nbsp;
                        <span className={classes.greyTextColor}><strike>₹{product.price?.mrp}</strike></span>&nbsp;&nbsp;&nbsp;
                        <span style={{color: '#388E3C'}}>{product.price?.discount} off</span>
                    </Typography>
                    
                    <ProductDetail product={product} />
                </Grid>
            </Grid>
        </Box>
    )
}

export default DetailView;
