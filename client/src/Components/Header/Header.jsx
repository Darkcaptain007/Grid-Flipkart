import { AppBar, Toolbar, makeStyles, Box, Typography, withStyles, IconButton, Drawer, List } from '@material-ui/core';
import { Link, useLocation } from 'react-router-dom';
import CustomButtons from './CustomButtons';
import Search from './Search';
import { Menu } from '@material-ui/icons';
import { useState } from 'react';

const useStyle = makeStyles(theme => ({
    header: {
        background: '#2874f0',
        height: 56, // Adjusted height
        boxShadow: 'none',
    },
    headerHome: {
        background: '#FFFFFF',
        color: '#000000',
        borderBottom: '1px solid #e0e0e0',
    },
    component: {
        marginLeft: '8%',
        lineHeight: 0,
        textDecoration: 'none',
        color: 'inherit',
    },
    logoText: {
        fontSize: '20px',
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: '#FFFFFF',
    },
    logoTextHome: {
        color: '#2874f0',
    },
    container: {
        display: 'flex',
    },
    subHeading: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#FFFFFF',
    },
    subHeadingHome: {
        color: '#878787',
    },
    subURL: {
        width: 10,
        height: 10,
        marginLeft: 4
    },
    // --- UI ENHANCEMENT: Toolbar is now the main layout container ---
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        minHeight: 56
    },
    // --- UI ENHANCEMENT: New style for the search container ---
    searchContainer: {
        flexGrow: 1, // Allows this container to take up all available horizontal space
        display: 'flex',
        justifyContent: 'center', // Centers the Search bar within this container
        padding: '0 20px', // Adds some breathing room around the search bar
    },
    list: {
        width: 250
    },
    menuButton: {
        display: 'none',
        [theme.breakpoints.down('sm')]: {
            display: 'block'
        }
    },
}));

// Using withStyles is fine, but for consistency, we'll use the toolbar class from makeStyles.
// const ToolBar = withStyles({ root: { minHeight: 56 } })(Toolbar);

const Header = () => {
    const classes = useStyle();
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    
    const subURL = 'https://static-assets-web.flixcart.com/www/linchpin/fk-cp-zion/img/plus_aef861.png';

    const [open, setOpen] = useState(false);
    const handleClose = () => { setOpen(false); }
    const handleOpen = () => { setOpen(true); }

    const list = () => (
        <Box className={classes.list} onClick={handleClose}>
            <List><listItem button><CustomButtons isHomePage={isHomePage} /></listItem></List>
        </Box>
    );

    return (
        <AppBar position="fixed" className={`${classes.header} ${isHomePage ? classes.headerHome : ''}`}>
            {/* --- UI ENHANCEMENT: Use the new styled Toolbar --- */}
            <Toolbar className={classes.toolbar}>
                <IconButton color="inherit" className={classes.menuButton} onClick={handleOpen}>
                    <Menu />
                </IconButton>

                <Drawer open={open} onClose={handleClose}>{list()}</Drawer>

                <Link to='/' className={classes.component}>
                    <Typography className={`${classes.logoText} ${isHomePage ? classes.logoTextHome : ''}`}>
                        Flipkart
                    </Typography>
                    <Box component="span" className={classes.container}>
                        <Typography className={`${classes.subHeading} ${isHomePage ? classes.subHeadingHome : ''}`}>
                            Explore <Box component="span" style={{color:'#FFE500'}}>Plus</Box>
                        </Typography>
                        <img src={subURL} className={classes.subURL} alt="" />
                    </Box>
                </Link>
                
                {/* --- UI ENHANCEMENT: Search bar is now wrapped for centering --- */}
                <Box className={classes.searchContainer}>
                    <Search />
                </Box>
                
                {/* CustomButtons is now a direct child, pushed to the right by the search container */}
                <CustomButtons isHomePage={isHomePage} />
            </Toolbar>
        </AppBar>
    )
}

export default Header;