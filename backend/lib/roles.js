/**
 * Central Roles Configuration
 * This file is the single source of truth for all roles in the system
 * Update roles here and they will be reflected throughout the application
 */

// ============= ROLE DEFINITIONS =============
const SYSTEM_ROLES = [
    'ADMIN',
    'CEO',
    'INCUBATION_MANAGER',
    'ACCOUNTANT',
    'OFFICER_IN_CHARGE',
    'FACULTY_IN_CHARGE',
    'EMPLOYEE'
];

/**
 * Get all valid roles (system roles + custom roles from database)
 * @returns {Promise<string[]>} Array of valid role IDs
 */
const getAllValidRoles = async () => {
    try {
        // Import here to avoid circular dependency
        const RolePermission = require('../models/RolePermission');
        const dbRoles = await RolePermission.find({ isActive: true }).select('roleId');
        const customRoles = dbRoles.map(r => r.roleId);
        
        // Combine system roles with custom roles from database
        return [...new Set([...SYSTEM_ROLES, ...customRoles])];
    } catch (error) {
        // If database is not available or error occurs, return system roles
        console.warn('Could not fetch custom roles from database, using system roles only');
        return SYSTEM_ROLES;
    }
};

/**
 * Validate if a role is valid
 * @param {string} role - The role to validate
 * @returns {Promise<boolean>}
 */
const isValidRole = async (role) => {
    const validRoles = await getAllValidRoles();
    return validRoles.includes(role);
};

/**
 * Sync validator function for Mongoose schema
 * Note: This only validates against SYSTEM_ROLES for schema validation
 * Use isValidRole() for runtime validation that includes database roles
 */
const roleEnumValidator = {
    validator: function(value) {
        return SYSTEM_ROLES.includes(value);
    },
    message: props => `${props.value} is not a valid system role. Valid roles are: ${SYSTEM_ROLES.join(', ')}`
};

module.exports = {
    SYSTEM_ROLES,
    getAllValidRoles,
    isValidRole,
    roleEnumValidator
};
