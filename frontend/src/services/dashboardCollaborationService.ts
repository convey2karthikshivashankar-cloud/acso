import { DashboardTemplate } from '../components/dashboard/DashboardLayoutEngine';
import { DashboardShare, DashboardUser, UserRole } from '../components/dashboard/RoleBasedDashboard';

export interface CollaborationPermission {
  id: string;
  name: string;
  description: string;
  actions: string[];
}

export interface ShareRequest {
  dashboardId: string;
  sharedWith: string[];
  permissions: string[];
  message?: string;
  expiresAt?: Date;
}

export interface ShareNotification {
  id: string;
  type: 'share_received' | 'share_revoked' | 'permission_changed';
  dashboardId: string;
  dashboardName: string;
  sharedBy: string;
  sharedByName: string;
  permissions: string[];
  message?: string;
  createdAt: Date;
  read: boolean;
}

export interface DashboardActivity {
  id: string;
  dashboardId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'shared' | 'viewed' | 'exported' | 'deleted';
  details?: Record<string, any>;
  timestamp: Date;
}

export interface DashboardComment {
  id: string;
  dashboardId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  mentions?: string[];
  attachments?: string[];
  createdAt: Date;
  updatedAt?: Date;
  replies?: DashboardComment[];
}

export class DashboardCollaborationService {
  private static instance: DashboardCollaborationService;
  private shares: Map<string, DashboardShare[]> = new Map();
  private notifications: Map<string, ShareNotification[]> = new Map();
  private activities: Map<string, DashboardActivity[]> = new Map();
  private comments: Map<string, DashboardComment[]> = new Map();

  static getInstance(): DashboardCollaborationService {
    if (!DashboardCollaborationService.instance) {
      DashboardCollaborationService.instance = new DashboardCollaborationService();
    }
    return DashboardCollaborationService.instance;
  }

  // Permission definitions
  private readonly permissions: CollaborationPermission[] = [
    {
      id: 'view',
      name: 'View',
      description: 'Can view the dashboard and its data',
      actions: ['read'],
    },
    {
      id: 'comment',
      name: 'Comment',
      description: 'Can add comments and participate in discussions',
      actions: ['read', 'comment'],
    },
    {
      id: 'edit',
      name: 'Edit',
      description: 'Can modify dashboard layout and widgets',
      actions: ['read', 'comment', 'edit'],
    },
    {
      id: 'share',
      name: 'Share',
      description: 'Can share the dashboard with others',
      actions: ['read', 'comment', 'edit', 'share'],
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Full control including deletion and permission management',
      actions: ['read', 'comment', 'edit', 'share', 'delete', 'manage_permissions'],
    },
  ];

  // Share dashboard with users or roles
  async shareDashboard(request: ShareRequest, sharedBy: DashboardUser): Promise<DashboardShare> {
    const share: DashboardShare = {
      id: `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dashboardId: request.dashboardId,
      sharedBy: sharedBy.id,
      sharedWith: request.sharedWith,
      permissions: request.permissions,
      expiresAt: request.expiresAt,
      createdAt: new Date(),
    };

    // Store the share
    const dashboardShares = this.shares.get(request.dashboardId) || [];
    dashboardShares.push(share);
    this.shares.set(request.dashboardId, dashboardShares);

    // Create notifications for shared users
    for (const userId of request.sharedWith) {
      await this.createShareNotification({
        type: 'share_received',
        dashboardId: request.dashboardId,
        dashboardName: `Dashboard ${request.dashboardId}`, // In real app, get actual name
        sharedBy: sharedBy.id,
        sharedByName: sharedBy.name,
        permissions: request.permissions,
        message: request.message,
        userId,
      });
    }

    // Log activity
    await this.logActivity({
      dashboardId: request.dashboardId,
      userId: sharedBy.id,
      userName: sharedBy.name,
      action: 'shared',
      details: {
        sharedWith: request.sharedWith,
        permissions: request.permissions,
      },
    });

    return share;
  }

  // Get shares for a dashboard
  getDashboardShares(dashboardId: string): DashboardShare[] {
    return this.shares.get(dashboardId) || [];
  }

  // Get dashboards shared with a user
  getSharedDashboards(userId: string): DashboardShare[] {
    const allShares: DashboardShare[] = [];
    
    for (const shares of this.shares.values()) {
      const userShares = shares.filter(share => 
        share.sharedWith.includes(userId) &&
        (!share.expiresAt || share.expiresAt > new Date())
      );
      allShares.push(...userShares);
    }
    
    return allShares;
  }

  // Update share permissions
  async updateSharePermissions(
    shareId: string,
    permissions: string[],
    updatedBy: DashboardUser
  ): Promise<void> {
    for (const [dashboardId, shares] of this.shares.entries()) {
      const shareIndex = shares.findIndex(s => s.id === shareId);
      if (shareIndex !== -1) {
        const share = shares[shareIndex];
        const oldPermissions = [...share.permissions];
        share.permissions = permissions;

        // Notify affected users
        for (const userId of share.sharedWith) {
          await this.createShareNotification({
            type: 'permission_changed',
            dashboardId,
            dashboardName: `Dashboard ${dashboardId}`,
            sharedBy: updatedBy.id,
            sharedByName: updatedBy.name,
            permissions,
            message: `Permissions updated from [${oldPermissions.join(', ')}] to [${permissions.join(', ')}]`,
            userId,
          });
        }

        // Log activity
        await this.logActivity({
          dashboardId,
          userId: updatedBy.id,
          userName: updatedBy.name,
          action: 'updated',
          details: {
            shareId,
            oldPermissions,
            newPermissions: permissions,
          },
        });

        break;
      }
    }
  }

  // Revoke share
  async revokeShare(shareId: string, revokedBy: DashboardUser): Promise<void> {
    for (const [dashboardId, shares] of this.shares.entries()) {
      const shareIndex = shares.findIndex(s => s.id === shareId);
      if (shareIndex !== -1) {
        const share = shares[shareIndex];
        
        // Notify affected users
        for (const userId of share.sharedWith) {
          await this.createShareNotification({
            type: 'share_revoked',
            dashboardId,
            dashboardName: `Dashboard ${dashboardId}`,
            sharedBy: revokedBy.id,
            sharedByName: revokedBy.name,
            permissions: [],
            message: 'Access to this dashboard has been revoked',
            userId,
          });
        }

        // Remove the share
        shares.splice(shareIndex, 1);

        // Log activity
        await this.logActivity({
          dashboardId,
          userId: revokedBy.id,
          userName: revokedBy.name,
          action: 'updated',
          details: {
            action: 'revoke_share',
            shareId,
            revokedUsers: share.sharedWith,
          },
        });

        break;
      }
    }
  }

  // Check if user has permission for dashboard
  hasPermission(
    dashboardId: string,
    userId: string,
    permission: string,
    userRole?: UserRole
  ): boolean {
    // Admin role has all permissions
    if (userRole?.permissions.includes('*')) {
      return true;
    }

    // Check role-based permissions
    if (userRole?.dashboardPermissions) {
      const rolePermissionMap: Record<string, keyof UserRole['dashboardPermissions']> = {
        'read': 'canEdit', // Basic read is covered by canEdit
        'edit': 'canEdit',
        'share': 'canShare',
        'delete': 'canDelete',
        'export': 'canExport',
      };

      const rolePermission = rolePermissionMap[permission];
      if (rolePermission && userRole.dashboardPermissions[rolePermission]) {
        return true;
      }
    }

    // Check share-based permissions
    const shares = this.getDashboardShares(dashboardId);
    const userShare = shares.find(share => 
      share.sharedWith.includes(userId) &&
      (!share.expiresAt || share.expiresAt > new Date())
    );

    if (userShare) {
      return userShare.permissions.includes(permission) || 
             userShare.permissions.includes('admin');
    }

    return false;
  }

  // Get available permissions
  getAvailablePermissions(): CollaborationPermission[] {
    return [...this.permissions];
  }

  // Notification management
  private async createShareNotification(params: {
    type: ShareNotification['type'];
    dashboardId: string;
    dashboardName: string;
    sharedBy: string;
    sharedByName: string;
    permissions: string[];
    message?: string;
    userId: string;
  }): Promise<void> {
    const notification: ShareNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      dashboardId: params.dashboardId,
      dashboardName: params.dashboardName,
      sharedBy: params.sharedBy,
      sharedByName: params.sharedByName,
      permissions: params.permissions,
      message: params.message,
      createdAt: new Date(),
      read: false,
    };

    const userNotifications = this.notifications.get(params.userId) || [];
    userNotifications.push(notification);
    this.notifications.set(params.userId, userNotifications);
  }

  // Get notifications for user
  getUserNotifications(userId: string): ShareNotification[] {
    return this.notifications.get(userId) || [];
  }

  // Mark notification as read
  markNotificationRead(userId: string, notificationId: string): void {
    const notifications = this.notifications.get(userId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  // Activity logging
  private async logActivity(params: {
    dashboardId: string;
    userId: string;
    userName: string;
    action: DashboardActivity['action'];
    details?: Record<string, any>;
  }): Promise<void> {
    const activity: DashboardActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dashboardId: params.dashboardId,
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      details: params.details,
      timestamp: new Date(),
    };

    const dashboardActivities = this.activities.get(params.dashboardId) || [];
    dashboardActivities.push(activity);
    this.activities.set(params.dashboardId, dashboardActivities);
  }

  // Get dashboard activity
  getDashboardActivity(dashboardId: string, limit: number = 50): DashboardActivity[] {
    const activities = this.activities.get(dashboardId) || [];
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Comment management
  async addComment(
    dashboardId: string,
    content: string,
    user: DashboardUser,
    mentions?: string[],
    attachments?: string[]
  ): Promise<DashboardComment> {
    const comment: DashboardComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dashboardId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content,
      mentions,
      attachments,
      createdAt: new Date(),
      replies: [],
    };

    const dashboardComments = this.comments.get(dashboardId) || [];
    dashboardComments.push(comment);
    this.comments.set(dashboardId, dashboardComments);

    // Log activity
    await this.logActivity({
      dashboardId,
      userId: user.id,
      userName: user.name,
      action: 'updated',
      details: {
        action: 'add_comment',
        commentId: comment.id,
        mentions,
      },
    });

    return comment;
  }

  // Get dashboard comments
  getDashboardComments(dashboardId: string): DashboardComment[] {
    const comments = this.comments.get(dashboardId) || [];
    return comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Add reply to comment
  async addReply(
    commentId: string,
    content: string,
    user: DashboardUser
  ): Promise<DashboardComment | null> {
    for (const [dashboardId, comments] of this.comments.entries()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        const reply: DashboardComment = {
          id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          dashboardId,
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar,
          content,
          createdAt: new Date(),
        };

        if (!comment.replies) {
          comment.replies = [];
        }
        comment.replies.push(reply);

        // Log activity
        await this.logActivity({
          dashboardId,
          userId: user.id,
          userName: user.name,
          action: 'updated',
          details: {
            action: 'add_reply',
            commentId,
            replyId: reply.id,
          },
        });

        return reply;
      }
    }
    return null;
  }

  // Export dashboard sharing report
  exportSharingReport(dashboardId: string): {
    dashboard: string;
    totalShares: number;
    activeShares: number;
    expiredShares: number;
    shares: Array<{
      sharedWith: string[];
      permissions: string[];
      sharedBy: string;
      createdAt: Date;
      expiresAt?: Date;
      status: 'active' | 'expired';
    }>;
    recentActivity: DashboardActivity[];
  } {
    const shares = this.getDashboardShares(dashboardId);
    const now = new Date();
    
    const activeShares = shares.filter(s => !s.expiresAt || s.expiresAt > now);
    const expiredShares = shares.filter(s => s.expiresAt && s.expiresAt <= now);

    return {
      dashboard: dashboardId,
      totalShares: shares.length,
      activeShares: activeShares.length,
      expiredShares: expiredShares.length,
      shares: shares.map(share => ({
        sharedWith: share.sharedWith,
        permissions: share.permissions,
        sharedBy: share.sharedBy,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        status: (!share.expiresAt || share.expiresAt > now) ? 'active' : 'expired',
      })),
      recentActivity: this.getDashboardActivity(dashboardId, 20),
    };
  }

  // Cleanup expired shares
  cleanupExpiredShares(): number {
    let cleanedCount = 0;
    const now = new Date();

    for (const [dashboardId, shares] of this.shares.entries()) {
      const initialLength = shares.length;
      const activeShares = shares.filter(share => !share.expiresAt || share.expiresAt > now);
      
      if (activeShares.length < initialLength) {
        this.shares.set(dashboardId, activeShares);
        cleanedCount += initialLength - activeShares.length;
      }
    }

    return cleanedCount;
  }
}

// Export singleton instance
export const dashboardCollaborationService = DashboardCollaborationService.getInstance();