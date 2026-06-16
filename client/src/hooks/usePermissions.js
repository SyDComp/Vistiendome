/**
 * usePermissions hook
 * Provides permission checking utilities based on current user's role
 */
import { useAuth } from '../context/AuthContext';
import { hasPermission, canWrite, canRead, canDelete, getRolePermissions } from '../utils/permissions';

export const usePermissions = () => {
    const { user } = useAuth();
    const roleName = user?.role?.name || user?.role; // Support both role object and string

    return {
        /**
         * Check if current user has a specific permission
         * @param {string} permission - Permission string (e.g., 'products.read')
         * @returns {boolean}
         */
        hasPermission: (permission) => hasPermission(roleName, permission),

        /**
         * Check if current user can write to a module
         * @param {string} module - Module name (products, sales, etc.)
         * @returns {boolean}
         */
        canWrite: (module) => canWrite(roleName, module),

        /**
         * Check if current user can delete from a module
         * @param {string} module - Module name (products, sales, etc.)
         * @returns {boolean}
         */
        canDelete: (module) => canDelete(roleName, module),

        /**
         * Check if current user can read from a module
         * @param {string} module - Module name (products, sales, etc.)
         * @returns {boolean}
         */
        canRead: (module) => canRead(roleName, module),

        /**
         * Get all permissions for current user's role
         * @returns {string[]}
         */
        permissions: getRolePermissions(roleName),

        /**
         * Current user's role name
         */
        role: roleName,

        /**
         * Check if user is admin
         */
        isAdmin: () => roleName === 'Admin',

        /**
         * Check if user is vendedor
         */
        isVendedor: () => roleName === 'Vendedor',

        /**
         * Check if user is repartidor
         */
        isRepartidor: () => roleName === 'Repartidor',

        /**
         * Check if user is soporte
         */
        isSoporte: () => roleName === 'Soporte',
    };
};
