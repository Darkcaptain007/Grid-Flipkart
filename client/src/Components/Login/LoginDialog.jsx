import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, TextField, Box, Button, makeStyles, Typography } from '@material-ui/core';
import { authenticateLogin, authenticateSignup } from '../../service/api';

const useStyle = makeStyles({
  component: {
    height: '70vh',
    width: '90vh',
    maxWidth: 'unset !important'
  },
  image: {
    backgroundImage: `url(${'https://static-assets-web.flixcart.com/www/linchpin/fk-cp-zion/img/login_img_c4a81e.png'})`,
    background: '#2874f0',
    backgroundPosition: 'center 85%',
    backgroundRepeat: 'no-repeat',
    height: '70vh',
    width: '40%',
    padding: '45px 35px',
    '& > *': {
      color: '#FFFFFF',
      fontWeight: 600
    }
  },
  login: {
    padding: '25px 35px',
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    '& > *': {
      marginTop: 20
    }
  },
  loginbtn: {
    textTransform: 'none',
    background: '#FB641B',
    color: '#fff',
    height: 48,
    borderRadius: 2
  },
  requestbtn: {
    textTransform: 'none',
    background: '#fff',
    color: '#2874f0',
    height: 48,
    borderRadius: 2,
    boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)'
  },
  text: {
    color: '#878787',
    fontSize: 12
  },
  createText: {
    margin: 'auto 0 5px 0',
    textAlign: 'center',
    color: '#2874f0',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer'
  },
  error: {
    fontSize: 10,
    color: '#ff6161',
    lineHeight: 0,
    marginTop: 10,
    fontWeight: 600
  }
});

const loginInitialValues = {
  email: '',
  password: ''
};

const signupInitialValues = {
  firstname: '',
  lastname: '',
  username: '',
  email: '',
  password: '',
  phone: ''
};

const accountInitialValues = {
  login: {
    view: 'login',
    heading: 'Login',
    subHeading: 'Get access to your Orders, Wishlist and Recommendations'
  },
  signup: {
    view: 'signup',
    heading: "Looks like you're new here",
    subHeading: 'Signup to get started'
  }
};

const LoginDialog = ({ open, setOpen, setAccount }) => {
  const classes = useStyle();
  const [login, setLogin] = useState(loginInitialValues);
  const [signup, setSignup] = useState(signupInitialValues);
  const [error, showError] = useState(false);
  const [account, toggleAccount] = useState(accountInitialValues.login);

  useEffect(() => {
    showError(false);
  }, [login]);

  const onValueChange = (e) => {
    setLogin({ ...login, [e.target.name]: e.target.value });
  };

  const onInputChange = (e) => {
    setSignup({ ...signup, [e.target.name]: e.target.value });
  };

  const loginUser = async () => {
    let response = await authenticateLogin(login);
    if (!response || !response.data || !response.data.token) {
      showError(true);
      return;
    }
    showError(false);
    try {
      // UPDATED: Store full user object as JSON (ensure it's an object)
      const userData = {
        username: response.data.user.username, // Extract what you need
        // Add other fields if available, e.g., id: response.data.user.id
      };
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(userData)); // Store as object
      console.log('Stored user in localStorage:', userData); // Debug log
      setAccount(userData.username);
      handleClose();
    } catch (err) {
      console.error('Error storing user:', err);
    }
  };

  const signupUser = async () => {
    try {
      let response = await authenticateSignup(signup);
      if (!response) throw new Error('No response from server');
      // UPDATED: Store full user object as JSON (ensure it's an object)
      const userData = {
        username: response.data.user.username || signup.username, // Fallback if response doesn't have it
        // Add other fields if available
      };
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(userData)); // Store as object
      console.log('Stored user in localStorage:', userData); // Debug log
      setAccount(userData.username);
      handleClose();
    } catch (error) {
      if (error.response?.status === 409 || error.response?.status === 401) {
        alert(error.response.data.message || 'User already exists');
      } else {
        alert('Signup failed: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const toggleSignup = () => {
    toggleAccount(accountInitialValues.signup);
  };

  const handleClose = () => {
    setOpen(false);
    toggleAccount(accountInitialValues.login);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md">
      <DialogContent className={classes.component}>
        <Box style={{ display: 'flex' }}>
          <Box className={classes.image}>
            <Typography variant="h5">{account.heading}</Typography>
            <Typography style={{ marginTop: 20 }}>{account.subHeading}</Typography>
          </Box>
          {account.view === 'login' ? (
            <Box className={classes.login}>
              <TextField onChange={onValueChange} name="email" label="Enter Email/Mobile number" />
              {error && <Typography className={classes.error}>Please enter valid Email ID/Mobile number</Typography>}
              <TextField onChange={onValueChange} name="password" label="Enter Password" />
              <Typography className={classes.text}>By continuing, you agree to Flipkart's Terms of Use and Privacy Policy.</Typography>
              <Button onClick={loginUser} className={classes.loginbtn}>Login</Button>
              <Typography className={classes.text} style={{ textAlign: 'center' }}>OR</Typography>
              <Button className={classes.requestbtn}>Request OTP</Button>
              <Typography className={classes.createText} onClick={toggleSignup}>New to Flipkart? Create an account</Typography>
            </Box>
          ) : (
            <Box className={classes.login}>
              <TextField onChange={onInputChange} name="firstname" label="Enter Firstname" />
              <TextField onChange={onInputChange} name="lastname" label="Enter Lastname" />
              <TextField onChange={onInputChange} name="username" label="Enter Username" />
              <TextField onChange={onInputChange} name="email" label="Enter Email" />
              <TextField onChange={onInputChange} name="password" label="Enter Password" />
              <TextField onChange={onInputChange} name="phone" label="Enter Phone" />
              <Button onClick={signupUser} className={classes.loginbtn}>Continue</Button>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
