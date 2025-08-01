import bcrypt from 'bcrypt';
import User from '../model/userSchema.js';
import jwt from 'jsonwebtoken';

export const userSignUp = async (req, res) => {
    try {
        const { firstname, lastname, username, email, password, phone } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            firstname,
            lastname,
            username,
            email,
            phone,
            password: hashedPassword
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id, username: newUser.username },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        res.status(200).json({ 
            message: `${newUser.firstname} has been successfully registered`,
            token,
            user: {
                id: newUser._id,
                firstname: newUser.firstname,
                lastname: newUser.lastname,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const userLogIn = async (req, res) => {
    try {
        // Frontend sends 'email' field, not 'emailOrUsername'
        const { email, password } = req.body;
        
        // Find user by email or username
        const user = await User.findOne({
            $or: [{ email }, { username: email }]
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Error: ' + err.message });
    }
};
