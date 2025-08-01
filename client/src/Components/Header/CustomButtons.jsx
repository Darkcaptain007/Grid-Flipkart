import { useState, useContext } from 'react';
import { makeStyles, Box, Typography, Badge, Button } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { ShoppingCart } from '@material-ui/icons';
import LoginDialog from '../Login/LoginDialog';
import { LoginContext } from '../../context/ContextProvider';
import { useSelector } from 'react-redux';
import Profile from './Profile';

const useStyle = makeStyles(theme => ({
  wrapper: {
    margin: '0 5% 0 auto',
    display: 'flex',
    alignItems: 'center',
    '& > *': {
      marginRight: 32,
      textDecoration: 'none',
      color: '#FFFFFF',
      fontSize: 12,
      alignItems: 'center',
      display: 'flex',
      lineHeight: '20px',
      [theme.breakpoints.down('sm')]: {
        color: '#ffffffff',
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        marginTop: 10
      }
    },
    [theme.breakpoints.down('sm')]: {
      display: 'block'
    }
  },
  login: {
    color: '#2874f0',
    background: '#FFFFFF',
    textTransform: 'none',
    fontWeight: 600,
    borderRadius: 2,
    padding: '5px 40px',
    height: 32,
    boxShadow: 'none',
    [theme.breakpoints.down('sm')]: {
      background: '#2874f0ff',
      color: '#FFFFFF'
    }
  }
}));

const CustomButtons = () => {
  const classes = useStyle();
  const [open, setOpen] = useState(false);
  const { account, logout, setAccount } = useContext(LoginContext);
  const cartDetails = useSelector(state => state.cart);
  const { cartItems } = cartDetails;

  const openDialog = () => setOpen(true);

  return (
    <Box className={classes.wrapper}>
      {/* User/Profile/Login section */}
      <Box display="flex" alignItems="center">
        {account
          ? <Profile account={account} setAccount={() => {}} />
          : <Button onClick={openDialog} className={classes.login}>Login</Button>
        }
      </Box>

      {/* "More" Section */}
      <Box display="flex" alignItems="center">
        <Typography>More</Typography>
      </Box>

      {/* Cart Section */}
      <Box display="flex" alignItems="center">
        <Link to="/cart" style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          color: '#FFF'
        }}>
          <Badge badgeContent={cartItems?.length} color="secondary">
            <ShoppingCart />
          </Badge>
          <Typography style={{ marginLeft: 10 }}>Cart</Typography>
        </Link>
      </Box>

      {/* Logout */}
      {account && (
        <Box display="flex" alignItems="center">
          <Button onClick={logout} style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>
            Logout
          </Button>
        </Box>
      )}

      {/* Login Dialog */}
      <LoginDialog open={open} setOpen={setOpen} setAccount={setAccount} />
    </Box>
  );
};

export default CustomButtons;
