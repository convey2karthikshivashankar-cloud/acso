import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'agents' | 'incidents' | 'financial' | 'workflows' | 'admin';
  level: 'read' | 'write' | 'admin';
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details: string;
  ipAddress: string;
}

export const RoleBasedAccessControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'permissions' | 'audit'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    // Initialize with sample data
    const samplePermissions: Permission[] = [
      // Dashboard permissions
      { id: '1', name: 'dashboard.view', description: 'View dashboard', category: 'dashboard', level: 'read' },
      { id: '2', name: 'dashboard.customize', description: 'Customize dashboard layout', category: 'dashboard', level: 'write' },
      
      // Agent permissions
      { id: '3', name: 'agents.view', description: 'View agent information', category: 'agents', level: 'read' },
      { id: '4', name: 'agents.configure', description: 'Configure agent settings', category: 'agents', level: 'write' },
      { id: '5', name: 'agents.manage', description: 'Full agent management', category: 'agents', level: 'admin' },
      
      // Incident permissions
      { id: '6', name: 'incidents.view', description: 'View incidents', category: 'incidents', level: 'read' },
      { id: '7', name: 'incidents.create', description: 'Create new incidents', category: 'incidents', level: 'write' },
      { id: '8', name: 'incidents.assign', description: 'Assign incidents to users', category: 'incidents', level: 'write' },
      { id: '9', name: 'incidents.close', description: 'Close incidents', category: 'incidents', level: 'admin' },
      
      // Financial permissions
      { id: '10', name: 'financial.view', description: 'View financial reports', category: 'financial', level: 'read' },
      { id: '11', name: 'financial.analyze', description: 'Access financial analysis tools', category: 'financial', level: 'write' },
      { id: '12', name: 'financial.budget', description: 'Manage budgets and forecasts', category: 'financial', level: 'admin' },
      
      // Workflow permissions
      { id: '13', name: 'workflows.view', description: 'View workflows', category: 'workflows', level: 'read' },
      { id: '14', name: 'workflows.create', description: 'Create and edit workflows', category: 'workflows', level: 'write' },
      { id: '15', name: 'workflows.execute', description: 'Execute workflows', category: 'workflows', level: 'write' },
      
      // Admin permissions
      { id: '16', name: 'admin.users', description: 'Manage users', category: 'admin', level: 'admin' },
      { id: '17', name: 'admin.roles', description: 'Manage roles and permissions', category: 'admin', level: 'admin' },
      { id: '18', name: 'admin.audit', description: 'View audit logs', category: 'admin', level: 'admin' },
      { id: '19', name: 'admin.system', description: 'System administration', category: 'admin', level: 'admin' }
    ];

    const sampleRoles: Role[] = [
      {
        id: '1',
        name: 'Administrator',
        description: 'Full system access with all permissions',
        permissions: samplePermissions.map(p => p.id),
        isSystem: true,
        userCount: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: '2',
        name: 'Security Analyst',
        description: 'Security operations and incident management',
        permissions: ['1', '2', '3', '4', '6', '7', '8', '13', '14', '15'],
        isSystem: false,
        userCount: 8,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-02-01')
      },
      {
        id: '3',
        name: 'Financial Manager',
        description: 'Financial analysis and budget management',
        permissions: ['1', '10', '11', '12'],
        isSystem: false,
        userCount: 3,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-25')
      },
      {
        id: '4',
        name: 'Viewer',
        description: 'Read-only access to dashboards and reports',
        permissions: ['1', '3', '6', '10', '13'],
        isSystem: true,
        userCount: 15,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ];

    const sampleUsers: User[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@acso.com',
        roles: ['1'],
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date('2024-01-01')
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@acso.com',
        roles: ['2'],
        isActive: true,
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-15')
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob.johnson@acso.com',
        roles: ['3'],
        isActive: true,
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
        createdAt: new Date('2024-01-20')
      },
      {
        id: '4',
        name: 'Alice Brown',
        email: 'alice.brown@acso.com',
        roles: ['4'],
        isActive: false,
        createdAt: new Date('2024-02-01')
      }
    ];

    const sampleAuditLogs: AuditLog[] = [
      {
        id: '1',
        action: 'LOGIN',
        resource: 'Authentication',
        userId: '1',
        userName: 'John Doe',
        timestamp: new Date(),
        details: 'Successful login with MFA',
        ipAddress: '192.168.1.100'
      },
      {
        id: '2',
        action: 'ROLE_ASSIGNED',
        resource: 'User Management',
        userId: '1',
        userName: 'John Doe',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        details: 'Assigned Security Analyst role to jane.smith@acso.com',
        ipAddress: '192.168.1.100'
      },
      {
        id: '3',
        action: 'INCIDENT_CREATED',
        resource: 'Incident Management',
        userId: '2',
        userName: 'Jane Smith',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        details: 'Created incident: Database Connection Timeout',
        ipAddress: '192.168.1.105'
      },
      {
        id: '4',
        action: 'PERMISSION_DENIED',
        resource: 'Financial Reports',
        userId: '4',
        userName: 'Alice Brown',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        details: 'Attempted to access financial.budget without permission',
        ipAddress: '192.168.1.110'
      }
    ];

    setPermissions(samplePermissions);
    setRoles(sampleRoles);
    setUsers(sampleUsers);
    setAuditLogs(sampleAuditLogs);
  }, []);

  const getPermissionsByCategory = () => {
    const categories = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
    
    return categories;
  };

  const getLevelColor = (level: string) => {
    const colors = {
      read: 'success',
      write: 'warning',
      admin: 'danger'
    };
    return colors[level as keyof typeof colors] || 'secondary';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      dashboard: 'bi-speedometer2',
      agents: 'bi-cpu',
      incidents: 'bi-exclamation-triangle',
      financial: 'bi-graph-up',
      workflows: 'bi-diagram-3',
      admin: 'bi-gear'
    };
    return icons[category as keyof typeof icons] || 'bi-circle';
  };

  const renderRolesTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5>Role Management</h5>
        <button
          className="btn btn-primary"
          onClick={() => setShowRoleModal(true)}
        >
          <i className="bi bi-plus-lg me-2"></i>
          Create Role
        </button>
      </div>

      <div className="row">
        {roles.map(role => (
          <div key={role.id} className="col-md-6 mb-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="mb-1">
                      {role.name}
                      {role.isSystem && (
                        <span className="badge bg-info ms-2">System</span>
                      )}
                    </h6>
                    <p className="text-muted small mb-2">{role.description}</p>
                  </div>
                  <div className="dropdown">
                    <button
                      className="btn btn-outline-secondary btn-sm dropdown-toggle"
                      type="button"
                      data-bs-toggle="dropdown"
                    >
                      Actions
                    </button>
                    <ul className="dropdown-menu">
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => setSelectedRole(role)}
                        >
                          <i className="bi bi-eye me-2"></i>View Details
                        </button>
                      </li>
                      {!role.isSystem && (
                        <>
                          <li>
                            <button className="dropdown-item">
                              <i className="bi bi-pencil me-2"></i>Edit Role
                            </button>
                          </li>
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <button className="dropdown-item text-danger">
                              <i className="bi bi-trash me-2"></i>Delete Role
                            </button>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
                
                <div className="row text-center">
                  <div className="col-4">
                    <div className="h5 text-primary mb-0">{role.permissions.length}</div>
                    <small className="text-muted">Permissions</small>
                  </div>
                  <div className="col-4">
                    <div className="h5 text-success mb-0">{role.userCount}</div>
                    <small className="text-muted">Users</small>
                  </div>
                  <div className="col-4">
                    <div className="small text-muted">
                      Updated<br />
                      {format(role.updatedAt, 'MMM dd')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5>User Management</h5>
        <button
          className="btn btn-primary"
          onClick={() => setShowUserModal(true)}
        >
          <i className="bi bi-plus-lg me-2"></i>
          Add User
        </button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <strong>{user.name}</strong>
                        <div className="small text-muted">{user.email}</div>
                      </div>
                    </td>
                    <td>
                      {user.roles.map(roleId => {
                        const role = roles.find(r => r.id === roleId);
                        return role ? (
                          <span key={roleId} className="badge bg-secondary me-1">
                            {role.name}
                          </span>
                        ) : null;
                      })}
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {user.lastLogin ? (
                        <span className="small">
                          {format(user.lastLogin, 'MMM dd, HH:mm')}
                        </span>
                      ) : (
                        <span className="text-muted small">Never</span>
                      )}
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-outline-secondary">
                          <i className="bi bi-key"></i>
                        </button>
                        <button className="btn btn-outline-danger">
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPermissionsTab = () => {
    const categorizedPermissions = getPermissionsByCategory();
    
    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5>Permission Management</h5>
          <button className="btn btn-primary">
            <i className="bi bi-plus-lg me-2"></i>
            Create Permission
          </button>
        </div>

        {Object.entries(categorizedPermissions).map(([category, perms]) => (
          <div key={category} className="card mb-3">
            <div className="card-header">
              <h6 className="mb-0">
                <i className={`${getCategoryIcon(category)} me-2`}></i>
                {category.charAt(0).toUpperCase() + category.slice(1)} Permissions
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                {perms.map(permission => (
                  <div key={permission.id} className="col-md-6 mb-2">
                    <div className="d-flex justify-content-between align-items-center p-2 border rounded">
                      <div>
                        <strong className="small">{permission.name}</strong>
                        <div className="text-muted small">{permission.description}</div>
                      </div>
                      <span className={`badge bg-${getLevelColor(permission.level)}`}>
                        {permission.level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAuditTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5>Audit Logs</h5>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" style={{ width: 'auto' }}>
            <option>All Actions</option>
            <option>LOGIN</option>
            <option>ROLE_ASSIGNED</option>
            <option>PERMISSION_DENIED</option>
          </select>
          <button className="btn btn-outline-primary btn-sm">
            <i className="bi bi-download me-1"></i>
            Export
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td className="small">
                      {format(log.timestamp, 'MMM dd, HH:mm:ss')}
                    </td>
                    <td>
                      <strong className="small">{log.userName}</strong>
                    </td>
                    <td>
                      <span className={`badge ${
                        log.action === 'LOGIN' ? 'bg-success' :
                        log.action === 'PERMISSION_DENIED' ? 'bg-danger' :
                        'bg-info'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="small">{log.resource}</td>
                    <td className="small">{log.details}</td>
                    <td className="small text-muted">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="role-based-access-control">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">Role-Based Access Control</h4>
          <p className="text-muted mb-0">Manage user roles, permissions, and access control</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <i className="bi bi-people me-1"></i>
            Roles
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="bi bi-person me-1"></i>
            Users
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <i className="bi bi-key me-1"></i>
            Permissions
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <i className="bi bi-clipboard-data me-1"></i>
            Audit Logs
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'roles' && renderRolesTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'permissions' && renderPermissionsTab()}
        {activeTab === 'audit' && renderAuditTab()}
      </div>

      {/* Role Details Modal */}
      {selectedRole && (
        <div className="modal fade show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Role Details: {selectedRole.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedRole(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Description:</strong>
                    <p>{selectedRole.description}</p>
                  </div>
                  <div className="col-md-6">
                    <strong>Statistics:</strong>
                    <ul className="list-unstyled">
                      <li>Users: {selectedRole.userCount}</li>
                      <li>Permissions: {selectedRole.permissions.length}</li>
                      <li>Created: {format(selectedRole.createdAt, 'MMM dd, yyyy')}</li>
                    </ul>
                  </div>
                </div>
                
                <h6>Assigned Permissions</h6>
                <div className="row">
                  {selectedRole.permissions.map(permId => {
                    const permission = permissions.find(p => p.id === permId);
                    return permission ? (
                      <div key={permId} className="col-md-6 mb-2">
                        <div className="d-flex justify-content-between align-items-center p-2 border rounded">
                          <div>
                            <strong className="small">{permission.name}</strong>
                            <div className="text-muted small">{permission.description}</div>
                          </div>
                          <span className={`badge bg-${getLevelColor(permission.level)}`}>
                            {permission.level}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedRole(null)}
                >
                  Close
                </button>
                {!selectedRole.isSystem && (
                  <button type="button" className="btn btn-primary">
                    Edit Role
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};