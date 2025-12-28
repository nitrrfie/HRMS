const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { protect, isAdminOrCEO, authorize } = require('../middleware/auth');
const { validateRole } = require('../middleware/validateRole');

// Ensure uploads directory exists for profile photos
const uploadDir = path.join(__dirname, '../uploads/profile-photos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for profile photo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Allow only image types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get('/', protect, async (req, res) => {
    try {
        const { role, isActive, search } = req.query;
        
        let query = {};
        
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { 'profile.firstName': { $regex: search, $options: 'i' } },
                { 'profile.lastName': { $regex: search, $options: 'i' } }
            ];
        }
        
        const users = await User.find(query)
            .select('-password')
            .populate('employment.reportingTo', 'username profile.firstName profile.lastName')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, count: users.length, users });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Change password (accessible by any authenticated user)
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide current and new password' });
        }
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Check if current password is correct
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Update own profile (accessible by any authenticated user)
// IMPORTANT: This route must come BEFORE /:id to avoid route conflicts
router.put('/profile/me', protect, async (req, res) => {
    try {
        const { profile } = req.body;
        
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Users can only update their own profile information, not role or employment
        if (profile) {
            // Filter out undefined values to avoid Mongoose validation errors
            const cleanProfile = {};
            
            Object.keys(profile).forEach(key => {
                if (profile[key] !== undefined && profile[key] !== null) {
                    cleanProfile[key] = profile[key];
                }
            });
            
            // Handle nested address object separately
            if (profile.address) {
                cleanProfile.address = {
                    ...user.profile?.address,
                    ...profile.address
                };
            }
            
            // Preserve existing nested objects that weren't updated
            user.profile = { 
                ...user.profile.toObject(),
                ...cleanProfile
            };
        }
        
        await user.save();
        
        // Return user without password
        const updatedUser = await User.findById(user._id).select('-password');
        
        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            user: updatedUser 
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

router.get('/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('employment.reportingTo', 'username profile.firstName profile.lastName');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/', protect, isAdminOrCEO, async (req, res) => {
    try {
        const { employeeId, username, email, password, role, profile, employment } = req.body;
        
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }, { employeeId }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email, username or employee ID' });
        }
        
        const user = await User.create({
            employeeId,
            username,
            email,
            password,
            role,
            profile,
            employment
        });
        
        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            user: {
                id: user._id,
                employeeId: user.employeeId,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.put('/:id', protect, isAdminOrCEO, validateRole, async (req, res) => {
    try {
        const { profile, employment, role, isActive, leaveBalance } = req.body;
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (profile) {
            // Filter out undefined values to avoid Mongoose validation errors
            const cleanProfile = {};
            
            Object.keys(profile).forEach(key => {
                if (profile[key] !== undefined && profile[key] !== null) {
                    cleanProfile[key] = profile[key];
                }
            });
            
            // Handle nested address object separately
            if (profile.address) {
                cleanProfile.address = {
                    ...user.profile?.address,
                    ...profile.address
                };
            }
            
            user.profile = { 
                ...user.profile.toObject(),
                ...cleanProfile
            };
        }
        if (employment) user.employment = { ...user.employment, ...employment };
        if (role) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        if (leaveBalance) user.leaveBalance = { ...user.leaveBalance, ...leaveBalance };
        
        await user.save();
        
        res.json({ 
            success: true, 
            message: 'Employee updated successfully',
            user 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.delete('/:id', protect, isAdminOrCEO, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.isActive = false;
        await user.save();
        
        res.json({ success: true, message: 'Employee deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/stats/overview', protect, isAdminOrCEO, async (req, res) => {
    try {
        const totalEmployees = await User.countDocuments({ isActive: true });
        const roleWise = await User.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalEmployees,
                roleWise
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all employees for peer rating (accessible by all authenticated users)
router.get('/peer-rating/employees', protect, async (req, res) => {
    try {
        const users = await User.find({ isActive: true })
            .select('_id username profile employment role')
            .sort({ createdAt: 1 });
        
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Upload profile photo
router.post('/:id/upload-photo', protect, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No photo uploaded' });
        }

        const userId = req.params.id;
        
        // Check if user is updating their own profile or is admin
        if (req.user.id !== userId && req.user.role !== 'ADMIN' && req.user.role !== 'CEO') {
            // Delete uploaded file if unauthorized
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Delete old photo if exists
        if (user.profile && user.profile.photo) {
            const oldPhotoPath = path.join(__dirname, '..', user.profile.photo);
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
            }
        }

        // Update user profile with new photo path
        const photoPath = `/uploads/profile-photos/${req.file.filename}`;
        
        if (!user.profile) {
            user.profile = {};
        }
        user.profile.photo = photoPath;
        
        await user.save();

        res.json({
            success: true,
            message: 'Profile photo uploaded successfully',
            photoPath: photoPath
        });
    } catch (error) {
        // Delete uploaded file on error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
