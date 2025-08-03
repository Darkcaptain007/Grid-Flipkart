import { useState } from 'react';
import { Box, Typography, Menu, MenuItem, makeStyles } from '@material-ui/core';
import { PowerSettingsNew, AccountCircle, ExpandMore } from '@material-ui/icons';

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

// --- ENHANCEMENT: Accept `logout` as a prop ---
const Profile = ({ account, setAccount, logout, isHomePage }) => {
    const [open, setOpen] = useState(false);
    const classes = useStyle();
    const profileColor = isHomePage ? '#000000' : '#FFFFFF';

    const handleClick = (event) => {
        setOpen(event.currentTarget);
    };

    const handleClose = () => {
        setOpen(false);
    };

    // --- ENHANCEMENT: This handler now calls the passed-in logout function ---
    const handleLogout = () => {
        handleClose(); // First, close the menu
        logout();      // Then, call the logout function from the context
    };
    
    return (
        <>
            <Box onClick={handleClick} className={classes.container} style={{ color: profileColor }}>
                <AccountCircle />
                <Typography className={classes.username}>{account}</Typography>
                <ExpandMore fontSize="small" />
            </Box>

            <Menu
                anchorEl={open}
                open={Boolean(open)}
                onClose={handleClose}
                className={classes.menuComponent}
            >
                {/* --- ENHANCEMENT: onClick now calls the clean handler function --- */}
                <MenuItem onClick={handleLogout}>
                    <PowerSettingsNew fontSize='small' color='primary'/> 
                    <Typography className={classes.logout}>Logout</Typography>
                </MenuItem>
            </Menu>
        </>
    )    
}

export default Profile;