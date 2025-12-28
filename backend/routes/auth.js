const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { validateRole } = require('../middleware/validateRole');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

router.post('/register', protect, validateRole, async(req, res) =>{
    try{
        const { employeeId, username, email, password, role, profile, employment } = req.body;

        //check if user exists
        const userExists = await User.findOne({ $or: [{ username }, { email }, { employeeId }]});
        if(userExists){
            return res.status(400).json({ message: 'User with given username, email or employee id already exists'});
        }

        //Create user
        const user = await User.create({
            employeeId,
            username,
            email,
            password,
            role: role || 'EMPLOYEE',
            profile: profile || {}, 
            employment
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                _id: user._id,
                employeeId: user.employeeId,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    }catch(error){
        res.status(500).json({message: 'Server error', error: error.message })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ 
            $or: [{ username }, { email: username }] 
        });
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const isMatch = await user.matchPassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }
        
        const token = generateToken(user._id);
        
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                employeeId: user.employeeId,
                username: user.username,
                email: user.email,
                role: user.role,
                profile: user.profile,
                employment: user.employment,
                leaveBalance: user.leaveBalance
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.put('/profile', protect, async (req, res) => {
    try {
        const { profile, bankDetails } = req.body;
        
        const user = await User.findById(req.user._id);
        
        if (profile) {
            user.profile = { ...user.profile, ...profile };
        }
        if (bankDetails) {
            user.bankDetails = { ...user.bankDetails, ...bankDetails };
        }
        
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                profile: user.profile,
                bankDetails: user.bankDetails
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user._id);
        
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        user.password = newPassword;
        await user.save();
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
