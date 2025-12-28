const mongoose = require('mongoose');

/**
 * RolePermission Model
 * Stores dynamic role configurations and component access permissions
 */
const RolePermissionSchema = new mongoose.Schema({
    // Role identifier (should match ROLES constant)
    roleId: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        index: true  // Combined unique + index declaration
    },
    
    // Display name for the role
    displayName: {
        type: String,
        required: true
    },
    
    // Hierarchy level (0=highest, 3=lowest)
    hierarchyLevel: {
        type: Number,
        required: true,
        min: 0,
        max: 10,
        default: 3
    },
    
    // Description of the role
    description: {
        type: String,
        default: ''
    },
    
    // Component access permissions
    componentAccess: [{
        componentId: {
            type: String,
            required: true
        },
        componentName: {
            type: String,
            required: true
        },
        hasAccess: {
            type: Boolean,
            default: false
        }
    }],
    
    // Feature-level permissions
    featureAccess: [{
        featureId: {
            type: String,
            required: true
        },
        featureName: {
            type: String,
            required: true
        },
        hasAccess: {
            type: Boolean,
            default: false
        }
    }],
    
    // Whether this role is active
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Whether this is a system role (cannot be deleted)
    isSystemRole: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true 
});

// Index for faster queries (roleId already has unique index)
RolePermissionSchema.index({ isActive: 1 });

module.exports = mongoose.model('RolePermission', RolePermissionSchema);
