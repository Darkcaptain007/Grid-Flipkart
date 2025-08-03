import { useState, useContext } from 'react';
import { makeStyles, Box, Typography, Button } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { ShoppingCart } from '@material-ui/icons';
import LoginDialog from '../Login/LoginDialog';
import { LoginContext } from '../../context/ContextProvider';
import { useSelector } from 'react-redux';
import Profile from './Profile';

const useStyle = makeStyles(theme => ({
    wrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '40px',
        margin: '0 5% 0 auto', // Pushes the whole group to the right
    },
    linkText: {
        fontSize: 16,
        fontWeight: 500,
        cursor: 'pointer',
    },
    homePageText: {
        color: '#000000',
    },
    defaultText: {
        color: '#FFFFFF',
    },
    login: {
        color: '#2874f0',
        background: '#FFFFFF',
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: 2,
        padding: '5px 40px',
        height: 32,
        boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)',
    },
    cartLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none'
    }
}));

const CustomButtons = ({ isHomePage }) => {
    const classes = useStyle();
    const [open, setOpen] = useState(false);
    const { account, logout, setAccount } = useContext(LoginContext);
    const { cartItems } = useSelector(state => state.cart);

    const openDialog = () => setOpen(true);
    const textColorClass = isHomePage ? classes.homePageText : classes.defaultText;

    return (
        <Box className={classes.wrapper}>
            {account ? (
                <Profile account={account} setAccount={setAccount} logout={logout} isHomePage={isHomePage} />
            ) : (
                <Button variant="contained" onClick={openDialog} className={classes.login}>
                    Login
                </Button>
            )}

            <Typography className={`${classes.linkText} ${textColorClass}`}>
                Become a Seller
            </Typography>
            
            <Typography className={`${classes.linkText} ${textColorClass}`}>
                More
            </Typography>

            <Link to="/cart" className={`${classes.cartLink} ${textColorClass}`}>
                <ShoppingCart />
                <Typography>Cart</Typography>
            </Link>
            
            <LoginDialog open={open} setOpen={setOpen} setAccount={setAccount} />
        </Box>
    );
};

export default CustomButtons;