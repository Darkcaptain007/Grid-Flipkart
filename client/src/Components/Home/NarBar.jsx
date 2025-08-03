import { Box, makeStyles, Typography } from '@material-ui/core';
import { navData } from '../../constant/data';

// --- UI ENHANCEMENT: Styles completely overhauled to match Flipkart's UI ---
const useStyle = makeStyles(theme => ({
    component: {
        display: 'flex',
        justifyContent: 'space-between',
        margin: '0 64px', // Add horizontal margin
        overflowX: 'auto', // Allow scrolling on small screens
        background: '#fff', // White background
        padding: '12px 8px',
        [theme.breakpoints.down('md')]: {
            margin: 0
        }
    },
    container: {
        padding: '12px 8px',
        textAlign: 'center',
        cursor: 'pointer',
    },
    image: {
        width: 64
    },
    text: {
        fontSize: 14,
        fontWeight: 600, // Bolder font
        fontFamily: 'inherit'
    }
}));

const NavBar = () => {
    const classes = useStyle();
    return (
        <Box className={classes.component}>
            {
                navData.map(data => (
                    <Box className={classes.container} key={data.text}>
                        <img src={data.url} className={classes.image} alt={data.text} />
                        <Typography className={classes.text}>{data.text}</Typography>
                    </Box>
                ))
            }
        </Box>
    )
}

export default NavBar;