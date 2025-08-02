import { useState } from 'react';
import { Box, Typography, Menu, MenuItem, makeStyles } from '@material-ui/core';
import { PowerSettingsNew, AccountCircle, ExpandMore } from '@material-ui/icons';

// --- ENHANCEMENT: New styles to match Flipkart's UI ---
const useStyle = makeStyles(theme => ({
    container: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
    },
    menuComponent: {
        marginTop: 40,
    },
    username: {
        marginLeft: 8,
        marginRight: 4,
        fontWeight: 600,
        fontSize: 14,
        color: '#fff', // Ensure text is white
        [theme.breakpoints.down('sm')]: {
          color: '#2874f0', // Change color for mobile drawer view if needed
        }
    },
    icon: {
        color: '#fff',
        [theme.breakpoints.down('sm')]: {
          color: '#2874f0',
        }
    },
    logout: {
        fontSize: 14,
        marginLeft: 20
    }
}));

const Profile = ({ account, setAccount }) => {
    const [open, setOpen] = useState(false);
    const classes = useStyle();

    const handleClick = (event) => {
        setOpen(event.currentTarget);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const logout = () => {
        setAccount('');
        // Also clear from local storage for consistency
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };
    
    return (
        <>
            {/* --- ENHANCEMENT: Replaced simple text with Icon -> Name -> Arrow structure --- */}
            <Box onClick={handleClick} className={classes.container}>
                <AccountCircle className={classes.icon} />
                <Typography className={classes.username}>{account}</Typography>
                <ExpandMore className={classes.icon} fontSize="small" />
            </Box>

            <Menu
                anchorEl={open}
                open={Boolean(open)}
                onClose={handleClose}
                className={classes.menuComponent}
            >
                <MenuItem onClick={() => { handleClose(); logout();}}>
                    <PowerSettingsNew fontSize='small' color='primary'/> 
                    <Typography className={classes.logout}>Logout</Typography>
                </MenuItem>
            </Menu>
        </>
    )    
}

export default Profile;