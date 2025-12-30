const express = require('express');
const router = express.Router();
const RolePermission = require('../models/RolePermission');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { SYSTEM_ROLES, getAllValidRoles } = require('../lib/roles');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }
    next();
};

// ============= ROLE MANAGEMENT =============

/**
 * GET /api/admin/roles
 * Get all role configurations
 */
router.get('/roles', protect, isAdmin, async (req, res) => {
    try {
        const roles = await RolePermission.find().sort({ hierarchyLevel: 1 });
        res.json({ success: true, roles });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * GET /api/admin/roles/:roleId
 * Get specific role configuration
 */
router.get('/roles/:roleId', protect, isAdmin, async (req, res) => {
    try {
        const role = await RolePermission.findOne({ roleId: req.params.roleId });
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        res.json({ success: true, role });
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * POST /api/admin/roles
 * Create new role configuration
 */
router.post('/roles', protect, isAdmin, async (req, res) => {
    try {
        const { roleId, displayName, hierarchyLevel, description, componentAccess, featureAccess } = req.body;
        
        // Check if role already exists
        const existingRole = await RolePermission.findOne({ roleId: roleId.toUpperCase() });
        if (existingRole) {
            return res.status(400).json({ success: false, message: 'Role already exists' });
        }
        
        const newRole = new RolePermission({
            roleId: roleId.toUpperCase(),
            displayName,
            hierarchyLevel,
            description,
            componentAccess: componentAccess || [],
            featureAccess: featureAccess || [],
            isSystemRole: false
        });
        
        await newRole.save();
        res.json({ success: true, role: newRole, message: 'Role created successfully' });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * PUT /api/admin/roles/:roleId
 * Update role configuration
 */
router.put('/roles/:roleId', protect, isAdmin, async (req, res) => {
    try {
        const { displayName, hierarchyLevel, description, componentAccess, featureAccess, isActive } = req.body;
        
        console.log('Updating role:', req.params.roleId);
        console.log('Request body:', { displayName, hierarchyLevel, description, componentAccess, featureAccess, isActive });
        
        const role = await RolePermission.findOne({ roleId: req.params.roleId });
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        
        console.log('Current role before update:', role);
        
        // Update fields
        if (displayName !== undefined) role.displayName = displayName;
        if (hierarchyLevel !== undefined) role.hierarchyLevel = hierarchyLevel;
        if (description !== undefined) role.description = description;
        if (componentAccess !== undefined) role.componentAccess = componentAccess;
        if (featureAccess !== undefined) role.featureAccess = featureAccess;
        if (isActive !== undefined) role.isActive = isActive;
        
        await role.save();
        console.log('Role after update:', role);
        
        res.json({ success: true, role, message: 'Role updated successfully' });
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * DELETE /api/admin/roles/:roleId
 * Delete role configuration (only non-system roles)
 */
router.delete('/roles/:roleId', protect, isAdmin, async (req, res) => {
    try {
        const role = await RolePermission.findOne({ roleId: req.params.roleId });
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        
        if (role.isSystemRole) {
            return res.status(400).json({ success: false, message: 'Cannot delete system role' });
        }
        
        // Check if any users have this role
        const usersWithRole = await User.countDocuments({ role: req.params.roleId });
        if (usersWithRole > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete role. ${usersWithRole} user(s) still have this role.` 
            });
        }
        
        await RolePermission.deleteOne({ roleId: req.params.roleId });
        res.json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============= COMPONENT DEFINITIONS =============

/**
 * GET /api/admin/components
 * Get available components that can be assigned to roles
 */
router.get('/components', protect, isAdmin, async (req, res) => {
    try {
        // Define role groups for easy assignment
        const roleGroups = [
            { id: 'ALL', name: 'All Roles', description: 'All users including employees', roles: ['ADMIN', 'CEO', 'INCUBATION_MANAGER', 'ACCOUNTANT', 'OFFICER_IN_CHARGE', 'FACULTY_IN_CHARGE', 'EMPLOYEE'] },
            { id: 'MANAGERS', name: 'All Managers', description: 'All management roles', roles: ['ADMIN', 'CEO', 'INCUBATION_MANAGER', 'ACCOUNTANT', 'OFFICER_IN_CHARGE', 'FACULTY_IN_CHARGE'] },
            { id: 'TOP_MANAGEMENT', name: 'Top Management', description: 'Admin and CEO only', roles: ['ADMIN', 'CEO'] },
            { id: 'MIDDLE_MANAGEMENT', name: 'Middle Management', description: 'Department managers', roles: ['INCUBATION_MANAGER', 'ACCOUNTANT', 'OFFICER_IN_CHARGE', 'FACULTY_IN_CHARGE'] },
            { id: 'FINANCE', name: 'Finance Team', description: 'Accountants only', roles: ['ACCOUNTANT'] },
            { id: 'FACULTY', name: 'Faculty', description: 'Faculty members only', roles: ['FACULTY_IN_CHARGE'] },
            { id: 'STAFF', name: 'Staff Only', description: 'Regular employees', roles: ['EMPLOYEE'] }
        ];

        // Define available components with default role group assignments
        const components = [
            { id: 'dashboard', name: 'Dashboard', description: 'Main dashboard view', icon: 'LayoutDashboard', defaultRoleGroup: 'ALL' },
            { id: 'employees', name: 'Employees', description: 'View and manage employee records', icon: 'Users', defaultRoleGroup: 'MANAGERS' },
            { id: 'attendance', name: 'Attendance', description: 'View and manage attendance records', icon: 'CalendarCheck', defaultRoleGroup: 'MANAGERS' },
            { id: 'leave', name: 'Leave Management', description: 'Approve/reject leave requests', icon: 'Clock', defaultRoleGroup: 'MANAGERS' },
            { id: 'salary', name: 'Salary', description: 'View salary information', icon: 'DollarSign', defaultRoleGroup: 'FINANCE' },
            { id: 'peer-rating', name: 'Peer Rating', description: 'Rate peer performance', icon: 'Star', defaultRoleGroup: 'MANAGERS' },
            { id: 'variable-remuneration', name: 'Variable Remuneration', description: 'Manage variable remuneration', icon: 'Star', defaultRoleGroup: 'FACULTY' },
            { id: 'remuneration', name: 'Remuneration', description: 'View remuneration details', icon: 'FileText', defaultRoleGroup: 'MANAGERS' },
            { id: 'calendar', name: 'Calendar', description: 'View and manage calendar', icon: 'FileText', defaultRoleGroup: 'MANAGERS' },
            { id: 'efiling', name: 'E-Filing', description: 'Electronic file management', icon: 'FolderOpen', defaultRoleGroup: 'MANAGERS' },
            { id: 'settings', name: 'Settings', description: 'System settings and configuration', icon: 'SettingsIcon', defaultRoleGroup: 'MANAGERS' },
            { id: 'profile', name: 'Profile', description: 'Edit user profile', icon: 'UserCircle', defaultRoleGroup: 'ALL' },
            { id: 'admin', name: 'Admin Panel', description: 'Admin configuration panel', icon: 'Shield', defaultRoleGroup: 'TOP_MANAGEMENT' }
        ];
        
        // Fetch all unique features from database roles
        const roles = await RolePermission.find();
        const featuresMap = new Map();
        
        // Aggregate all unique features from all roles
        roles.forEach(role => {
            if (role.featureAccess && Array.isArray(role.featureAccess)) {
                role.featureAccess.forEach(feature => {
                    if (feature.featureId && !featuresMap.has(feature.featureId)) {
                        featuresMap.set(feature.featureId, {
                            id: feature.featureId,
                            name: feature.featureName || feature.featureId,
                            description: feature.description || `Feature: ${feature.featureName || feature.featureId}`,
                            defaultRoleGroup: feature.defaultRoleGroup || 'MANAGERS'
                        });
                    }
                });
            }
        });
        
        // Convert map to array and sort by ID
        const features = Array.from(featuresMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        
        res.json({ success: true, components, features, roleGroups });
    } catch (error) {
        console.error('Error fetching components:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * POST /api/admin/initialize
 * Initialize default role permissions from code
 */
router.post('/initialize', protect, isAdmin, async (req, res) => {
    try {
        // Check if already initialized
        const existingRoles = await RolePermission.countDocuments();
        if (existingRoles > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Roles already initialized. Use reset endpoint to re-initialize.' 
            });
        }
        
        // Get components and features
        const components = [
            { componentId: 'dashboard', componentName: 'Dashboard' },
            { componentId: 'employees', componentName: 'Employees' },
            { componentId: 'attendance', componentName: 'Attendance' },
            { componentId: 'leave', componentName: 'Leave Management' },
            { componentId: 'salary', componentName: 'Salary' },
            { componentId: 'peer-rating', componentName: 'Peer Rating' },
            { componentId: 'variable-remuneration', componentName: 'Variable Remuneration' },
            { componentId: 'remuneration', componentName: 'Remuneration' },
            { componentId: 'calendar', componentName: 'Calendar' },
            { componentId: 'efiling', componentName: 'E-Filing' },
            { componentId: 'settings', componentName: 'Settings' },
            { componentId: 'profile', componentName: 'Profile' },
            { componentId: 'admin', componentName: 'Admin Panel' }
        ];
        
        // Default roles configuration
        const defaultRoles = [
            {
                roleId: 'ADMIN',
                displayName: 'Admin',
                hierarchyLevel: 0,
                description: 'System administrator with full access',
                isSystemRole: true,
                componentAccess: components.map(c => ({ ...c, hasAccess: true }))
            },
            {
                roleId: 'CEO',
                displayName: 'CEO',
                hierarchyLevel: 1,
                description: 'Chief Executive Officer',
                isSystemRole: true,
                componentAccess: components.map(c => ({ 
                    ...c, 
                    hasAccess: !['admin', 'salary', 'variable-remuneration'].includes(c.componentId)
                }))
            },
            {
                roleId: 'INCUBATION_MANAGER',
                displayName: 'Incubation Manager',
                hierarchyLevel: 2,
                description: 'Manager of incubation programs',
                isSystemRole: true,
                componentAccess: components.map(c => ({ 
                    ...c, 
                    hasAccess: !['admin', 'salary', 'variable-remuneration'].includes(c.componentId)
                }))
            },
            {
                roleId: 'ACCOUNTANT',
                displayName: 'Accountant',
                hierarchyLevel: 2,
                description: 'Financial accountant',
                isSystemRole: true,
                componentAccess: components.map(c => ({ 
                    ...c, 
                    hasAccess: ['dashboard', 'employees', 'attendance', 'leave', 'salary', 'remuneration', 'efiling', 'settings', 'profile'].includes(c.componentId)
                }))
            },
            {
                roleId: 'OFFICER_IN_CHARGE',
                displayName: 'Officer In-Charge',
                hierarchyLevel: 2,
                description: 'Officer managing operations',
                isSystemRole: true,
                componentAccess: components.map(c => ({ 
                    ...c, 
                    hasAccess: !['admin', 'salary', 'variable-remuneration'].includes(c.componentId)
                }))
            },
            {
                roleId: 'FACULTY_IN_CHARGE',
                displayName: 'Faculty In-Charge',
                hierarchyLevel: 2,
                description: 'Faculty member in charge',
                isSystemRole: true,
                componentAccess: components.map(c => ({ 
                    ...c, 
                    hasAccess: ['dashboard', 'employees', 'attendance', 'leave', 'variable-remuneration', 'remuneration', 'calendar', 'efiling', 'settings', 'profile'].includes(c.componentId)
                }))
            },
            {
                roleId: 'EMPLOYEE',
                displayName: 'Employee',
                hierarchyLevel: 3,
                description: 'Regular employee',
                isSystemRole: true,
                componentAccess: components.map(c => ({ 
                    ...c, 
                    hasAccess: ['dashboard', 'employees', 'salary', 'profile'].includes(c.componentId)
                }))
            }
        ];
        
        await RolePermission.insertMany(defaultRoles);
        res.json({ success: true, message: 'Roles initialized successfully', count: defaultRoles.length });
    } catch (error) {
        console.error('Error initializing roles:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * POST /api/admin/reset
 * Reset all role permissions to default (dangerous operation)
 */
router.post('/reset', protect, isAdmin, async (req, res) => {
    try {
        await RolePermission.deleteMany({ isSystemRole: false });
        await RolePermission.deleteMany({});
        
        // Re-initialize
        const baseUrl = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:5000';
        const initResponse = await fetch(`${baseUrl}/api/admin/initialize`, {
            method: 'POST',
            headers: { 'Authorization': req.headers.authorization }
        });
        
        res.json({ success: true, message: 'All roles reset to defaults' });
    } catch (error) {
        console.error('Error resetting roles:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', protect, isAdmin, async (req, res) => {
    try {
        const totalRoles = await RolePermission.countDocuments();
        const activeRoles = await RolePermission.countDocuments({ isActive: true });
        const systemRoles = await RolePermission.countDocuments({ isSystemRole: true });
        const customRoles = await RolePermission.countDocuments({ isSystemRole: false });
        
        // Get user counts by role
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalRoles,
                activeRoles,
                systemRoles,
                customRoles,
                usersByRole
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * GET /api/admin/valid-roles
 * Get all valid roles (system + custom from database) with hierarchy details
 * This endpoint is public (no admin check) so any authenticated user can fetch roles
 */
router.get('/valid-roles', protect, async (req, res) => {
    try {
        const validRoles = await getAllValidRoles();
        
        // Get role details from database
        const roleDetails = await RolePermission.find({ isActive: true })
            .select('roleId displayName hierarchyLevel description isSystemRole')
            .lean();
        
        res.json({
            success: true,
            roles: validRoles,
            systemRoles: SYSTEM_ROLES,
            roleDetails: roleDetails
        });
    } catch (error) {
        console.error('Error fetching valid roles:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * GET /api/admin/user-permissions/:roleId
 * Get permissions for a specific role (for checking access)
 */
router.get('/user-permissions/:roleId', protect, async (req, res) => {
    try {
        const role = await RolePermission.findOne({ roleId: req.params.roleId });
        if (!role) {
            return res.status(404).json({ 
                success: false, 
                message: 'Role not found',
                componentAccess: [],
                featureAccess: []
            });
        }
        
        // Extract only the IDs where hasAccess is true
        const componentIds = (role.componentAccess || [])
            .filter(c => c.hasAccess === true)
            .map(c => c.componentId);
        
        const featureIds = (role.featureAccess || [])
            .filter(f => f.hasAccess === true)
            .map(f => f.featureId);
        
        res.json({ 
            success: true, 
            roleId: role.roleId,
            componentAccess: componentIds,
            featureAccess: featureIds
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            componentAccess: [],
            featureAccess: []
        });
    }
});

module.exports = router;
