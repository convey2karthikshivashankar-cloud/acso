import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions/roles, otherwise ANY
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = false,
  fallback = null,
  onUnauthorized,
}) => {
  const { hasPermission, hasRole, hasAnyRole, hasAllRoles } = usePermissions();

  const checkPermissions = (): boolean => {
    if (requiredPermissions.length === 0 && requiredRoles.length === 0) {
      return true; // No requirements, allow access
    }

    let hasRequiredPermissions = true;
    let hasRequiredRoles = true;

    // Check permissions
    if (requiredPermissions.length > 0) {
      if (requireAll) {
        hasRequiredPermissions = requiredPermissions.every(permission => {
          const [resource, action] = permission.split(':');
          return hasPermission(resource, action);
        });
      } else {
        hasRequiredPermissions = requiredPermissions.some(permission => {
          const [resource, action] = permission.split(':');
          return hasPermission(resource, action);
        });
      }
    }

    // Check roles
    if (requiredRoles.length > 0) {
      if (requireAll) {
        hasRequiredRoles = hasAllRoles(requiredRoles);
      } else {
        hasRequiredRoles = hasAnyRole(requiredRoles);
      }
    }

    // If requireAll is true, user must have both permissions AND roles
    // If requireAll is false, user must have permissions OR roles
    if (requireAll) {
      return hasRequiredPermissions && hasRequiredRoles;
    } else {
      // If both are specified, user needs at least one from each category
      if (requiredPermissions.length > 0 && requiredRoles.length > 0) {
        return hasRequiredPermissions && hasRequiredRoles;
      }
      // If only one category is specified, user needs to satisfy that category
      return hasRequiredPermissions || hasRequiredRoles;
    }
  };

  const hasAccess = checkPermissions();

  if (!hasAccess) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Convenience components for common use cases
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate requiredRoles={['admin']} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const SecurityManagerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate requiredRoles={['security_manager']} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const OperationsManagerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate requiredRoles={['operations_manager']} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const FinancialAnalystOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <PermissionGate requiredRoles={['financial_analyst']} fallback={fallback}>
    {children}
  </PermissionGate>
);

// Permission-based components
export const CanRead: React.FC<{ 
  resource: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate requiredPermissions={[`${resource}:read`]} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanWrite: React.FC<{ 
  resource: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate requiredPermissions={[`${resource}:write`]} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanExecute: React.FC<{ 
  resource: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate requiredPermissions={[`${resource}:execute`]} fallback={fallback}>
    {children}
  </PermissionGate>
);

export const CanAdmin: React.FC<{ 
  resource: string; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}> = ({ resource, children, fallback }) => (
  <PermissionGate requiredPermissions={[`${resource}:admin`]} fallback={fallback}>
    {children}
  </PermissionGate>
);