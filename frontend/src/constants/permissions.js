/**
 * =============================================================================
 * PERMISSIONS & ACCESS CONTROL SYSTEM
 * =============================================================================
 * This file provides navigation items configuration for the application.
 * 
 * IMPORTANT: Permissions are now managed dynamically through the database!
 * - Role permissions are stored in MongoDB (RolePermission collection)
 * - Access checking is done via AuthContext (canAccessComponent, canAccessFeature)
 * - Admin Panel provides UI to edit role permissions in real-time
 * 
 * The hardcoded permission definitions below are DEPRECATED and kept only
 * for reference and fallback purposes.
 * 
 * TO CONFIGURE ACCESS:
 * 1. Go to Admin Panel in the application
 * 2. Select a role to edit
 * 3. Check/uncheck components and features
 * 4. Save changes - they persist to database immediately
 * 
 * TO ADD A NEW COMPONENT OR FEATURE:
 * 1. Add it to NAVIGATION_ITEMS (for sidebar navigation)
 * 2. Add it to backend/routes/admin.js GET /components endpoint
 * 3. Run backend/seedRoles.js to update all roles with the new permission
 * =============================================================================
 */

// Helper constants for common role groups (for reference)
export const ROLE_GROUPS_HELPER = {
    ALL: ['ADMIN', 'CEO', 'INCUBATION_MANAGER', 'ACCOUNTANT', 'OFFICER_IN_CHARGE', 'FACULTY_IN_CHARGE', 'EMPLOYEE'],
    MANAGERS: ['ADMIN', 'CEO', 'INCUBATION_MANAGER', 'ACCOUNTANT', 'OFFICER_IN_CHARGE', 'FACULTY_IN_CHARGE'],
    TOP_MANAGEMENT: ['ADMIN', 'CEO'],
    MIDDLE_MANAGEMENT: ['INCUBATION_MANAGER', 'ACCOUNTANT', 'OFFICER_IN_CHARGE', 'FACULTY_IN_CHARGE'],
    FINANCE: ['ACCOUNTANT'],
    FACULTY: ['FACULTY_IN_CHARGE'],
    STAFF: ['EMPLOYEE']
};

/**
 * DEPRECATED: Component permissions are now stored in database
 * This is kept for fallback compatibility only
 */
export const COMPONENT_PERMISSIONS = {
    // This object is deprecated - permissions come from database via AuthContext
};

/**
 * DEPRECATED: Feature permissions are now stored in database  
 * This is kept for fallback compatibility only
 */
export const FEATURE_PERMISSIONS = {
    // This object is deprecated - permissions come from database via AuthContext
};

// ============= NAVIGATION/SIDEBAR ITEMS =============
/**
 * Configuration for sidebar navigation items
 * Automatically filtered based on user permissions
 */
export const NAVIGATION_ITEMS = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        view: 'dashboard',
        allowedRoles: ROLE_GROUPS_HELPER.ALL
    },
    {
        id: 'employees',
        label: 'Employees',
        icon: 'Users',
        view: 'employees',
        allowedRoles: ROLE_GROUPS_HELPER.MANAGERS
    },
    {
        id: 'attendance',
        label: 'Attendance',
        icon: 'CalendarCheck',
        view: 'attendance',
        allowedRoles: ROLE_GROUPS_HELPER.MANAGERS
    },
    {
        id: 'leave',
        label: 'Leave',
        icon: 'Clock',
        view: 'leave',
        allowedRoles: ROLE_GROUPS_HELPER.MANAGERS
    },
    {
        id: 'salary',
        label: 'Salary',
        icon: 'DollarSign',
        view: 'salary',
        allowedRoles: ['ACCOUNTANT', 'EMPLOYEE']
    },
    {
        id: 'peer-rating',
        label: 'Peer Rating',
        icon: 'Star',
        view: 'peer-rating',
        allowedRoles: [
            'ADMIN',
            'CEO',
            'INCUBATION_MANAGER',
            'ACCOUNTANT',
            'OFFICER_IN_CHARGE'
        ],
        customCheck: (user) => user?.role !== 'FACULTY_IN_CHARGE'
    },
    {
        id: 'variable-remuneration',
        label: 'Variable Remuneration',
        icon: 'Star',
        view: 'variable-remuneration',
        allowedRoles: ['FACULTY_IN_CHARGE']
    },
    {
        id: 'remuneration',
        label: 'Remuneration',
        icon: 'FileText',
        view: 'remuneration',
        allowedRoles: ROLE_GROUPS_HELPER.MANAGERS
    },
    {
        id: 'calendar',
        label: 'Calendar',
        icon: 'FileText',
        view: 'calendar',
        allowedRoles: ROLE_GROUPS_HELPER.MANAGERS
    },
    {
        id: 'efiling',
        label: 'E-Filing',
        icon: 'FolderOpen',
        view: 'efiling',
        allowedRoles: ROLE_GROUPS_HELPER.MANAGERS
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: 'SettingsIcon',
        view: 'settings',
        allowedRoles: ROLE_GROUPS_HELPER.MANAGERS
    },
    {
        id: 'admin',
        label: 'Admin Panel',
        icon: 'Shield',
        view: 'admin',
        allowedRoles: ['ADMIN']
    }
];

/**
 * DEPRECATED: Use canAccessComponent from AuthContext instead
 * This function is kept for fallback compatibility only
 */
export const canAccessComponent = (componentId, user) => {
    console.warn('canAccessComponent from permissions.js is deprecated. Use canAccessComponent from AuthContext.');
    return false;
};

/**
 * DEPRECATED: Use canAccessFeature from AuthContext instead
 * This function is kept for fallback compatibility only
 */
export const canAccessFeature = (featureId, user) => {
    console.warn('canAccessFeature from permissions.js is deprecated. Use canAccessFeature from AuthContext.');
    return false;
};

/**
 * Get navigation items accessible to current user based on database permissions
 * Uses the canAccessComponentFn from AuthContext to check database permissions
 * Falls back to role-based allowedRoles if database permissions are not set
 */
export const getAccessibleNavItems = (user, canAccessComponentFn) => {
    if (!user || !user.role) return [];
    
    // Filter based on database permissions OR fallback to allowedRoles
    return NAVIGATION_ITEMS.filter(item => {
        // First try database permissions
        if (canAccessComponentFn && canAccessComponentFn(item.view)) {
            return true;
        }
        
        // Fallback to hardcoded allowedRoles
        if (item.allowedRoles && item.allowedRoles.includes(user.role)) {
            // Check custom permission function if exists
            if (item.customCheck && !item.customCheck(user)) {
                return false;
            }
            return true;
        }
        
        return false;
    });
};

/**
 * DEPRECATED: Role permissions are now in database
 * This function returns empty objects for backward compatibility
 */
export const getRolePermissions = (role) => {
    console.warn('getRolePermissions is deprecated. Fetch from database via AuthContext.');
    return { components: [], features: [] };
};

/**
 * DEPRECATED: Use canAccessComponent/canAccessFeature from AuthContext
 */
export const hasAllPermissions = (permissionIds, user) => {
    console.warn('hasAllPermissions is deprecated. Use AuthContext permission functions.');
    return false;
};

/**
 * DEPRECATED: Use canAccessComponent/canAccessFeature from AuthContext
 */
export const hasAnyPermission = (permissionIds, user) => {
    console.warn('hasAnyPermission is deprecated. Use AuthContext permission functions.');
    return false;
};
