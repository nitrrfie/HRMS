/**
 * =============================================================================
 * ROLE MANAGEMENT SYSTEM
 * =============================================================================
 * This file is the central configuration for all roles in the HRMS system.
 * 
 * TO ADD A NEW ROLE:
 * 1. Add the role constant to the ROLES object below
 * 2. Add display name to ROLE_DISPLAY_NAMES
 * 3. Set hierarchy level in ROLE_HIERARCHY (0=highest, 3=lowest)
 * 4. Add to ROLE_LIST (exclude ADMIN - it's added automatically)
 * 5. Update backend User model enum to include the new role
 * 6. Configure permissions in permissions.js
 * =============================================================================
 */

// ============= ROLE DEFINITIONS =============
export const ROLES = {
    ADMIN: 'ADMIN',
    CEO: 'CEO',
    INCUBATION_MANAGER: 'INCUBATION_MANAGER',
    ACCOUNTANT: 'ACCOUNTANT',
    OFFICER_IN_CHARGE: 'OFFICER_IN_CHARGE',
    FACULTY_IN_CHARGE: 'FACULTY_IN_CHARGE',
    EMPLOYEE: 'EMPLOYEE'
    // TO ADD NEW ROLE: Add here, e.g., HR_MANAGER: 'HR_MANAGER',
};

// ============= ROLE DISPLAY NAMES =============
export const ROLE_DISPLAY_NAMES = {
    [ROLES.ADMIN]: 'Admin',
    [ROLES.CEO]: 'CEO',
    [ROLES.INCUBATION_MANAGER]: 'Incubation Manager',
    [ROLES.ACCOUNTANT]: 'Accountant',
    [ROLES.OFFICER_IN_CHARGE]: 'Officer In-Charge',
    [ROLES.FACULTY_IN_CHARGE]: 'Faculty In-Charge',
    [ROLES.EMPLOYEE]: 'Employee'
    // TO ADD NEW ROLE: Add display name, e.g., [ROLES.HR_MANAGER]: 'HR Manager',
};

// ============= ROLE HIERARCHY =============
// Lower number = Higher authority
// 0 = Super Admin, 1 = Top Management, 2 = Middle Management, 3 = Staff
export const ROLE_HIERARCHY = {
    [ROLES.ADMIN]: 0,
    [ROLES.OFFICER_IN_CHARGE]: 1,
    [ROLES.FACULTY_IN_CHARGE]: 1,
    [ROLES.CEO]: 2,
    [ROLES.INCUBATION_MANAGER]: 3,
    [ROLES.ACCOUNTANT]: 3,
    [ROLES.EMPLOYEE]: 4
    // TO ADD NEW ROLE: Set hierarchy, e.g., [ROLES.HR_MANAGER]: 2,
};

// ============= ROLE LISTS =============
// List of all roles except ADMIN (used for dropdowns, selections, etc.)
export const ROLE_LIST = [
    ROLES.OFFICER_IN_CHARGE,
    ROLES.FACULTY_IN_CHARGE,
    ROLES.CEO,
    ROLES.INCUBATION_MANAGER,
    ROLES.ACCOUNTANT,
    ROLES.EMPLOYEE
    // TO ADD NEW ROLE: Add to this list, e.g., ROLES.HR_MANAGER,
];

// All roles including ADMIN
export const ALL_ROLES = [ROLES.ADMIN, ...ROLE_LIST];

// ============= ROLE GROUPINGS =============
// Useful for permission checks
export const ROLE_GROUPS = {
    TOP_MANAGEMENT: [ROLES.ADMIN, ROLES.OFFICER_IN_CHARGE, ROLES.FACULTY_IN_CHARGE],
    MIDDLE_MANAGEMENT: [ROLES.CEO, ROLES.INCUBATION_MANAGER, ROLES.ACCOUNTANT],
    STAFF: [ROLES.EMPLOYEE],
    MANAGERS: [ROLES.ADMIN, ROLES.OFFICER_IN_CHARGE, ROLES.FACULTY_IN_CHARGE, ROLES.CEO, ROLES.INCUBATION_MANAGER, ROLES.ACCOUNTANT],
    FINANCE: [ROLES.ACCOUNTANT],
    FACULTY: [ROLES.FACULTY_IN_CHARGE],
    ALL: ALL_ROLES
};

// ============= UTILITY FUNCTIONS =============

export const hasPermission = (userRole, requiredLevel) => {
    return ROLE_HIERARCHY[userRole] <= requiredLevel;
};

export const canManageRole = (managerRole, targetRole) => {
    return ROLE_HIERARCHY[managerRole] < ROLE_HIERARCHY[targetRole];
};

export const getSubordinateRoles = (role) => {
    const level = ROLE_HIERARCHY[role];
    return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] > level);
};

export const getRoleDisplayName = (role) => {
    return ROLE_DISPLAY_NAMES[role] || role;
};

export const isInRoleGroup = (role, groupName) => {
    return ROLE_GROUPS[groupName]?.includes(role) || false;
};

export const getRoleLevel = (role) => {
    return ROLE_HIERARCHY[role] ?? 99;
};

export const hasEqualOrHigherAuthority = (userRole, targetRole) => {
    return getRoleLevel(userRole) <= getRoleLevel(targetRole);
};

export const getRolesAtOrBelowLevel = (level) => {
    return ALL_ROLES.filter(r => ROLE_HIERARCHY[r] >= level);
};

export const isValidRole = (role) => {
    return ALL_ROLES.includes(role);
};
