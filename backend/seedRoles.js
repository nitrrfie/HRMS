const mongoose = require('mongoose');
const dotenv = require('dotenv');
const RolePermission = require('./models/RolePermission');
const connectDB = require('./config/db');

dotenv.config();

/**
 * Role Seeding Script
 * This script seeds the RolePermission collection with default role configurations
 * based on the permissions defined in frontend/src/constants/permissions.js
 */

const roleDefinitions = [
    {
        roleId: 'ADMIN',
        displayName: 'Admin',
        hierarchyLevel: 0,
        description: 'System administrator with full access to all features including admin panel',
        isSystemRole: true,
        isActive: true,
        componentAccess: [
            { componentId: 'dashboard', componentName: 'Dashboard', hasAccess: true },
            { componentId: 'employees', componentName: 'Employee Management', hasAccess: true },
            { componentId: 'attendance', componentName: 'Attendance', hasAccess: true },
            { componentId: 'leave', componentName: 'Leave Management', hasAccess: true },
            { componentId: 'salary', componentName: 'Salary', hasAccess: false },
            { componentId: 'peer-rating', componentName: 'Peer Rating', hasAccess: true },
            { componentId: 'variable-remuneration', componentName: 'Variable Remuneration', hasAccess: false },
            { componentId: 'remuneration', componentName: 'Remuneration', hasAccess: true },
            { componentId: 'calendar', componentName: 'Calendar', hasAccess: true },
            { componentId: 'efiling', componentName: 'E-Filing', hasAccess: true },
            { componentId: 'settings', componentName: 'Settings', hasAccess: true },
            { componentId: 'profile', componentName: 'Profile', hasAccess: true },
            { componentId: 'admin', componentName: 'Admin Panel', hasAccess: true }
        ],
        featureAccess: [
            { featureId: 'employee.create', featureName: 'Create Employee', hasAccess: true },
            { featureId: 'employee.edit', featureName: 'Edit Employee', hasAccess: true },
            { featureId: 'employee.delete', featureName: 'Delete Employee', hasAccess: true },
            { featureId: 'employee.viewAll', featureName: 'View All Employees', hasAccess: true },
            { featureId: 'leave.approve', featureName: 'Approve Leave', hasAccess: true },
            { featureId: 'leave.apply', featureName: 'Apply Leave', hasAccess: true },
            { featureId: 'attendance.mark', featureName: 'Mark Attendance', hasAccess: true },
            { featureId: 'attendance.viewReports', featureName: 'View Attendance Reports', hasAccess: true },
            { featureId: 'remuneration.view', featureName: 'View Remuneration', hasAccess: true }
        ]
    },
    {
        roleId: 'OFFICER_IN_CHARGE',
        displayName: 'Officer in Charge',
        hierarchyLevel: 1,
        description: 'Operations officer with manager-level permissions',
        isSystemRole: true,
        isActive: true,
        componentAccess: [
            { componentId: 'dashboard', componentName: 'Dashboard', hasAccess: true },
            { componentId: 'employees', componentName: 'Employee Management', hasAccess: true },
            { componentId: 'attendance', componentName: 'Attendance', hasAccess: true },
            { componentId: 'leave', componentName: 'Leave Management', hasAccess: true },
            { componentId: 'salary', componentName: 'Salary', hasAccess: false },
            { componentId: 'peer-rating', componentName: 'Peer Rating', hasAccess: true },
            { componentId: 'variable-remuneration', componentName: 'Variable Remuneration', hasAccess: false },
            { componentId: 'remuneration', componentName: 'Remuneration', hasAccess: true },
            { componentId: 'calendar', componentName: 'Calendar', hasAccess: true },
            { componentId: 'efiling', componentName: 'E-Filing', hasAccess: true },
            { componentId: 'settings', componentName: 'Settings', hasAccess: true },
            { componentId: 'profile', componentName: 'Profile', hasAccess: true },
            { componentId: 'admin', componentName: 'Admin Panel', hasAccess: false }
        ],
        featureAccess: [
            { featureId: 'employee.edit', featureName: 'Edit Employee', hasAccess: true },
            { featureId: 'employee.viewAll', featureName: 'View All Employees', hasAccess: true },
            { featureId: 'leave.approve', featureName: 'Approve Leave', hasAccess: true },
            { featureId: 'leave.apply', featureName: 'Apply Leave', hasAccess: true },
            { featureId: 'attendance.mark', featureName: 'Mark Attendance', hasAccess: true },
            { featureId: 'attendance.viewReports', featureName: 'View Attendance Reports', hasAccess: true },
            { featureId: 'remuneration.view', featureName: 'View Remuneration', hasAccess: true }
        ]
    },
    {
        roleId: 'FACULTY_IN_CHARGE',
        displayName: 'Faculty in Charge',
        hierarchyLevel: 1,
        description: 'Faculty member with access to variable remuneration management',
        isSystemRole: true,
        isActive: true,
        componentAccess: [
            { componentId: 'dashboard', componentName: 'Dashboard', hasAccess: true },
            { componentId: 'employees', componentName: 'Employee Management', hasAccess: true },
            { componentId: 'attendance', componentName: 'Attendance', hasAccess: true },
            { componentId: 'leave', componentName: 'Leave Management', hasAccess: true },
            { componentId: 'salary', componentName: 'Salary', hasAccess: false },
            { componentId: 'peer-rating', componentName: 'Peer Rating', hasAccess: false },
            { componentId: 'variable-remuneration', componentName: 'Variable Remuneration', hasAccess: true },
            { componentId: 'remuneration', componentName: 'Remuneration', hasAccess: true },
            { componentId: 'calendar', componentName: 'Calendar', hasAccess: true },
            { componentId: 'efiling', componentName: 'E-Filing', hasAccess: true },
            { componentId: 'settings', componentName: 'Settings', hasAccess: true },
            { componentId: 'profile', componentName: 'Profile', hasAccess: true },
            { componentId: 'admin', componentName: 'Admin Panel', hasAccess: false }
        ],
        featureAccess: [
            { featureId: 'employee.edit', featureName: 'Edit Employee', hasAccess: true },
            { featureId: 'employee.viewAll', featureName: 'View All Employees', hasAccess: true },
            { featureId: 'leave.approve', featureName: 'Approve Leave', hasAccess: true },
            { featureId: 'leave.apply', featureName: 'Apply Leave', hasAccess: true },
            { featureId: 'attendance.mark', featureName: 'Mark Attendance', hasAccess: true },
            { featureId: 'attendance.viewReports', featureName: 'View Attendance Reports', hasAccess: true },
            { featureId: 'remuneration.view', featureName: 'View Remuneration', hasAccess: true },
            { featureId: 'remuneration.variable', featureName: 'Manage Variable Remuneration', hasAccess: true }
        ]
    },
    {
        roleId: 'CEO',
        displayName: 'CEO',
        hierarchyLevel: 2,
        description: 'Chief Executive Officer with high-level management access',
        isSystemRole: true,
        isActive: true,
        componentAccess: [
            { componentId: 'dashboard', componentName: 'Dashboard', hasAccess: true },
            { componentId: 'employees', componentName: 'Employee Management', hasAccess: true },
            { componentId: 'attendance', componentName: 'Attendance', hasAccess: true },
            { componentId: 'leave', componentName: 'Leave Management', hasAccess: true },
            { componentId: 'salary', componentName: 'Salary', hasAccess: false },
            { componentId: 'peer-rating', componentName: 'Peer Rating', hasAccess: true },
            { componentId: 'variable-remuneration', componentName: 'Variable Remuneration', hasAccess: false },
            { componentId: 'remuneration', componentName: 'Remuneration', hasAccess: true },
            { componentId: 'calendar', componentName: 'Calendar', hasAccess: true },
            { componentId: 'efiling', componentName: 'E-Filing', hasAccess: true },
            { componentId: 'settings', componentName: 'Settings', hasAccess: true },
            { componentId: 'profile', componentName: 'Profile', hasAccess: true },
            { componentId: 'admin', componentName: 'Admin Panel', hasAccess: false }
        ],
        featureAccess: [
            { featureId: 'employee.create', featureName: 'Create Employee', hasAccess: true },
            { featureId: 'employee.edit', featureName: 'Edit Employee', hasAccess: true },
            { featureId: 'employee.delete', featureName: 'Delete Employee', hasAccess: true },
            { featureId: 'employee.viewAll', featureName: 'View All Employees', hasAccess: true },
            { featureId: 'leave.approve', featureName: 'Approve Leave', hasAccess: true },
            { featureId: 'leave.apply', featureName: 'Apply Leave', hasAccess: true },
            { featureId: 'attendance.mark', featureName: 'Mark Attendance', hasAccess: true },
            { featureId: 'attendance.viewReports', featureName: 'View Attendance Reports', hasAccess: true },
            { featureId: 'remuneration.view', featureName: 'View Remuneration', hasAccess: true }
        ]
    },
    {
        roleId: 'INCUBATION_MANAGER',
        displayName: 'Incubation Manager',
        hierarchyLevel: 3,
        description: 'Manages incubation operations and has manager-level access',
        isSystemRole: true,
        isActive: true,
        componentAccess: [
            { componentId: 'dashboard', componentName: 'Dashboard', hasAccess: true },
            { componentId: 'employees', componentName: 'Employee Management', hasAccess: true },
            { componentId: 'attendance', componentName: 'Attendance', hasAccess: true },
            { componentId: 'leave', componentName: 'Leave Management', hasAccess: true },
            { componentId: 'salary', componentName: 'Salary', hasAccess: false },
            { componentId: 'peer-rating', componentName: 'Peer Rating', hasAccess: true },
            { componentId: 'variable-remuneration', componentName: 'Variable Remuneration', hasAccess: false },
            { componentId: 'remuneration', componentName: 'Remuneration', hasAccess: true },
            { componentId: 'calendar', componentName: 'Calendar', hasAccess: true },
            { componentId: 'efiling', componentName: 'E-Filing', hasAccess: true },
            { componentId: 'settings', componentName: 'Settings', hasAccess: true },
            { componentId: 'profile', componentName: 'Profile', hasAccess: true },
            { componentId: 'admin', componentName: 'Admin Panel', hasAccess: false }
        ],
        featureAccess: [
            { featureId: 'employee.edit', featureName: 'Edit Employee', hasAccess: true },
            { featureId: 'employee.viewAll', featureName: 'View All Employees', hasAccess: true },
            { featureId: 'leave.approve', featureName: 'Approve Leave', hasAccess: true },
            { featureId: 'leave.apply', featureName: 'Apply Leave', hasAccess: true },
            { featureId: 'attendance.mark', featureName: 'Mark Attendance', hasAccess: true },
            { featureId: 'attendance.viewReports', featureName: 'View Attendance Reports', hasAccess: true },
            { featureId: 'remuneration.view', featureName: 'View Remuneration', hasAccess: true }
        ]
    },
    {
        roleId: 'ACCOUNTANT',
        displayName: 'Accountant',
        hierarchyLevel: 3,
        description: 'Manages financial records including salary and remuneration',
        isSystemRole: true,
        isActive: true,
        componentAccess: [
            { componentId: 'dashboard', componentName: 'Dashboard', hasAccess: true },
            { componentId: 'employees', componentName: 'Employee Management', hasAccess: true },
            { componentId: 'attendance', componentName: 'Attendance', hasAccess: true },
            { componentId: 'leave', componentName: 'Leave Management', hasAccess: true },
            { componentId: 'salary', componentName: 'Salary', hasAccess: true },
            { componentId: 'peer-rating', componentName: 'Peer Rating', hasAccess: true },
            { componentId: 'variable-remuneration', componentName: 'Variable Remuneration', hasAccess: false },
            { componentId: 'remuneration', componentName: 'Remuneration', hasAccess: true },
            { componentId: 'calendar', componentName: 'Calendar', hasAccess: true },
            { componentId: 'efiling', componentName: 'E-Filing', hasAccess: true },
            { componentId: 'settings', componentName: 'Settings', hasAccess: true },
            { componentId: 'profile', componentName: 'Profile', hasAccess: true },
            { componentId: 'admin', componentName: 'Admin Panel', hasAccess: false }
        ],
        featureAccess: [
            { featureId: 'employee.edit', featureName: 'Edit Employee', hasAccess: true },
            { featureId: 'employee.viewAll', featureName: 'View All Employees', hasAccess: true },
            { featureId: 'salary.viewAll', featureName: 'View All Salaries', hasAccess: true },
            { featureId: 'salary.edit', featureName: 'Edit Salary', hasAccess: true },
            { featureId: 'leave.approve', featureName: 'Approve Leave', hasAccess: true },
            { featureId: 'leave.apply', featureName: 'Apply Leave', hasAccess: true },
            { featureId: 'attendance.mark', featureName: 'Mark Attendance', hasAccess: true },
            { featureId: 'attendance.viewReports', featureName: 'View Attendance Reports', hasAccess: true },
            { featureId: 'remuneration.view', featureName: 'View Remuneration', hasAccess: true }
        ]
    },
    {
        roleId: 'EMPLOYEE',
        displayName: 'Employee',
        hierarchyLevel: 4,
        description: 'Regular employee with basic access to view own information',
        isSystemRole: true,
        isActive: true,
        componentAccess: [
            { componentId: 'dashboard', componentName: 'Dashboard', hasAccess: true },
            { componentId: 'employees', componentName: 'Employee Management', hasAccess: false },
            { componentId: 'attendance', componentName: 'Attendance', hasAccess: false },
            { componentId: 'leave', componentName: 'Leave Management', hasAccess: false },
            { componentId: 'salary', componentName: 'Salary', hasAccess: true },
            { componentId: 'peer-rating', componentName: 'Peer Rating', hasAccess: false },
            { componentId: 'variable-remuneration', componentName: 'Variable Remuneration', hasAccess: false },
            { componentId: 'remuneration', componentName: 'Remuneration', hasAccess: false },
            { componentId: 'calendar', componentName: 'Calendar', hasAccess: false },
            { componentId: 'efiling', componentName: 'E-Filing', hasAccess: false },
            { componentId: 'settings', componentName: 'Settings', hasAccess: false },
            { componentId: 'profile', componentName: 'Profile', hasAccess: true },
            { componentId: 'admin', componentName: 'Admin Panel', hasAccess: false }
        ],
        featureAccess: [
            { featureId: 'salary.viewOwn', featureName: 'View Own Salary', hasAccess: true },
            { featureId: 'leave.apply', featureName: 'Apply Leave', hasAccess: true }
        ]
    }
];

const seedRoles = async () => {
    try {
        await connectDB();

        console.log('🌱 Starting role seeding...\n');

        // Clear existing role permissions (optional)
        const deleteResult = await RolePermission.deleteMany({});
        console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing roles\n`);

        let created = 0;
        let updated = 0;

        for (const roleDef of roleDefinitions) {
            const existing = await RolePermission.findOne({ roleId: roleDef.roleId });

            if (existing) {
                await RolePermission.findOneAndUpdate(
                    { roleId: roleDef.roleId },
                    roleDef,
                    { new: true }
                );
                console.log(`✏️  Updated: ${roleDef.displayName} (${roleDef.roleId})`);
                updated++;
            } else {
                await RolePermission.create(roleDef);
                console.log(`✅ Created: ${roleDef.displayName} (${roleDef.roleId})`);
                created++;
            }
        }

        console.log('\n📊 Seeding Summary:');
        console.log(`   Created: ${created} roles`);
        console.log(`   Updated: ${updated} roles`);
        console.log(`   Total: ${roleDefinitions.length} roles\n`);

        console.log('✨ Role seeding completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding roles:', error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    seedRoles();
}

module.exports = seedRoles;
