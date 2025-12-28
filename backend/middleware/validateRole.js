const { isValidRole } = require('../lib/roles');

/**
 * Middleware to validate role against both system roles and database roles
 * Use this middleware before saving/updating user roles
 */
const validateRole = async (req, res, next) => {
    try {
        const role = req.body.role;
        
        if (!role) {
            return next(); // No role in request, skip validation
        }
        
        const valid = await isValidRole(role);
        
        if (!valid) {
            return res.status(400).json({
                success: false,
                message: `Invalid role: ${role}. Please select a valid role or create it in the Admin Panel first.`
            });
        }
        
        next();
    } catch (error) {
        console.error('Role validation error:', error);
        next(); // Continue on error to avoid breaking the app
    }
};

module.exports = { validateRole };
