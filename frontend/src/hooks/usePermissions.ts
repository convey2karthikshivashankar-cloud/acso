import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { Permission, User } from '../types';

export interface UsePermissionsReturn {
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  hasAllRoles: (roleNames: string[]) => boolean;
  canAccess: (requiredPermissions?: string[], requiredRoles?: string[]) => boolean;
  user: User | null;
  permissions: Permission[];
  roles: string[];
}

export const usePermissions = (): UsePermissionsReturn => {
  const user = useAppSelector((state) => state.auth.user);

  const permissions = useMemo(() => {
    return user?.permissions || [];
  }, [user?.permissions]);

  const roles = useMemo(() => {
    return user?.roles || [];
  }, [user?.roles]);

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user || !permissions.length) return false;

    return permissions.some(permission => {
      // Check if user has wildcard permission
      if (permission.resource === '*' && permission.actions.includes('*')) {
        return true;
      }

      // Check resource match (exact or wildcard)
      const resourceMatch = permission.resource === '*' || permission.resource === resource;
      
      // Check action match (exact, admin, or wildcard)
      const actionMatch = 
        permission.actions.includes(action as any) || 
        permission.actions.includes('admin' as any) ||
        permission.actions.includes('*' as any);

      return resourceMatch && actionMatch;
    });
  };

  const hasRole = (roleName: string): boolean => {
    if (!user || !roles.length) return false;
    return roles.includes(roleName);
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    if (!user || !roles.length) return false;
    return roleNames.some(roleName => roles.includes(roleName));
  };

  const hasAllRoles = (roleNames: string[]): boolean => {
    if (!user || !roles.length) return false;
    return roleNames.every(roleName => roles.includes(roleName));
  };

  const canAccess = (requiredPermissions?: string[], requiredRoles?: string[]): boolean => {
    // Check role requirements
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = hasAnyRole(requiredRoles);
      if (!hasRequiredRole) return false;
    }

    // Check permission requirements
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasRequiredPermissions = requiredPermissions.every(permission => {
        const [resource, action] = permission.split(':');
        return hasPermission(resource, action);
      });
      if (!hasRequiredPermissions) return false;
    }

    return true;
  };

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    canAccess,
    user,
    permissions,
    roles,
  };
};