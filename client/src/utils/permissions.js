/**
 * Permission utilities for role-based access control (RBAC)
 * Defines permissions and provides helper functions to check user access
 */

export const PERMISSIONS = {
    // Products
    PRODUCTS_READ: 'products.read',
    PRODUCTS_WRITE: 'products.write',
    PRODUCTS_DELETE: 'products.delete',

    // Sales
    SALES_READ: 'sales.read',
    SALES_WRITE: 'sales.write',

    // Deliveries
    DELIVERIES_READ: 'deliveries.read',
    DELIVERIES_WRITE: 'deliveries.write',

    // Messages
    MESSAGES_READ: 'messages.read',
    MESSAGES_WRITE: 'messages.write',

    // Users
    USERS_READ: 'users.read',
    USERS_WRITE: 'users.write',

    // Config
    CONFIG_READ: 'config.read',
    CONFIG_WRITE: 'config.write',
};

// Role-Permission mapping (must match backend)
const ROLE_PERMISSIONS = {
    'Admin': Object.values(PERMISSIONS), // All permissions

    'Vendedor': [
        PERMISSIONS.PRODUCTS_READ,
        PERMISSIONS.PRODUCTS_WRITE,
        PERMISSIONS.SALES_READ,
        PERMISSIONS.SALES_WRITE,
        PERMISSIONS.DELIVERIES_READ,
        PERMISSIONS.DELIVERIES_WRITE,
    ],

    'Repartidor': [
        PERMISSIONS.DELIVERIES_READ,
        PERMISSIONS.DELIVERIES_WRITE,
    ],

    'Soporte': [
        PERMISSIONS.MESSAGES_READ,
        PERMISSIONS.MESSAGES_WRITE,
        PERMISSIONS.PRODUCTS_READ,     // Read-only
        PERMISSIONS.SALES_READ,        // Read-only
        PERMISSIONS.DELIVERIES_READ,   // Read-only
    ],
};

/**
 * Check if a role has a specific permission
 * @param {string} roleName - User's role name (Admin, Vendedor, etc.)
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
export const hasPermission = (roleName, permission) => {
    if (!roleName) return false;
    const rolePerms = ROLE_PERMISSIONS[roleName] || [];
    return rolePerms.includes(permission);
};

/**
 * Check if role can write (create/edit/delete) to a module
 * @param {string} roleName - User's role name
 * @param {string} module - Module name (products, sales, deliveries, messages, users, config)
 * @returns {boolean} True if role has write permission
 */
export const canWrite = (roleName, module) => {
    const permission = PERMISSIONS[`${module.toUpperCase()}_WRITE`];
    return hasPermission(roleName, permission);
};

/**
 * Check if role can delete from a module
 * @param {string} roleName - User's role name
 * @param {string} module - Module name
 * @returns {boolean} True if role has delete permission
 */
export const canDelete = (roleName, module) => {
    // If it's products and not Admin, or explicitly denied
    if (module === 'products' && roleName !== 'Admin') return false;

    const permission = PERMISSIONS[`${module.toUpperCase()}_DELETE`] || PERMISSIONS[`${module.toUpperCase()}_WRITE`];
    return hasPermission(roleName, permission);
};

/**
 * Check if role can read from a module
 * @param {string} roleName - User's role name  
 * @param {string} module - Module name (products, sales, deliveries, messages, users, config)
 * @returns {boolean} True if role has read permission
 */
export const canRead = (roleName, module) => {
    const permission = PERMISSIONS[`${module.toUpperCase()}_READ`];
    return hasPermission(roleName, permission);
};

/**
 * Get all permissions for a role
 * @param {string} roleName - User's role name
 * @returns {string[]} Array of permission strings
 */
export const getRolePermissions = (roleName) => {
    return ROLE_PERMISSIONS[roleName] || [];
};
