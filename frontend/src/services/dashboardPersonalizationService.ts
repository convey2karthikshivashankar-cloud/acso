import { DashboardCustomization } from '../components/dashboard/DashboardCustomizer';
import { DashboardTemplate } from '../components/dashboard/DashboardLayoutEngine';

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  category: 'theme' | 'layout' | 'complete';
  preview?: string;
  customization: Partial<DashboardCustomization>;
  tags: string[];
  popularity: number;
  createdBy?: string;
  createdAt: Date;
}

export interface UserPersonalization {
  userId: string;
  preferences: {
    defaultTheme: 'light' | 'dark' | 'auto';
    defaultDensity: 'compact' | 'comfortable' | 'spacious';
    enableAnimations: boolean;
    autoSave: boolean;
    showTips: boolean;
  };
  customizations: Record<string, DashboardCustomization>;
  favoritePresets: string[];
  recentlyUsed: {
    dashboardId: string;
    timestamp: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export class DashboardPersonalizationService {
  private static instance: DashboardPersonalizationService;
  private personalizations: Map<string, UserPersonalization> = new Map();
  private presets: Map<string, DashboardPreset> = new Map();

  static getInstance(): DashboardPersonalizationService {
    if (!DashboardPersonalizationService.instance) {
      DashboardPersonalizationService.instance = new DashboardPersonalizationService();
      DashboardPersonalizationService.instance.initializePresets();
    }
    return DashboardPersonalizationService.instance;
  }

  private initializePresets() {
    // Built-in theme presets
    const themePresets: DashboardPreset[] = [
      {
        id: 'dark-theme',
        name: 'Dark Theme',
        description: 'Professional dark theme for low-light environments',
        category: 'theme',
        customization: {
          theme: {
            mode: 'dark',
            primaryColor: '#90caf9',
            secondaryColor: '#f48fb1',
            backgroundColor: '#121212',
            cardStyle: 'elevated',
            borderRadius: 8,
            density: 'comfortable',
          },
        },
        tags: ['dark', 'professional', 'low-light'],
        popularity: 85,
        createdAt: new Date(),
      },
      {
        id: 'high-contrast',
        name: 'High Contrast',
        description: 'High contrast theme for accessibility',
        category: 'theme',
        customization: {
          theme: {
            mode: 'light',
            primaryColor: '#000000',
            secondaryColor: '#ffffff',
            backgroundColor: '#ffffff',
            cardStyle: 'outlined',
            borderRadius: 2,
            density: 'spacious',
          },
        },
        tags: ['accessibility', 'high-contrast', 'readable'],
        popularity: 45,
        createdAt: new Date(),
      },
    ];

    // Layout presets
    const layoutPresets: DashboardPreset[] = [
      {
        id: 'compact-layout',
        name: 'Compact Layout',
        description: 'Dense layout for maximum information density',
        category: 'layout',
        customization: {
          layout: {
            columns: 16,
            rowHeight: 40,
            margin: [5, 5],
            padding: [8, 8],
            compactType: 'vertical',
            autoResize: true,
            snapToGrid: true,
          },
        },
        tags: ['compact', 'dense', 'efficient'],
        popularity: 67,
        createdAt: new Date(),
      },
    ];

    // Store all presets
    [...themePresets, ...layoutPresets].forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  // Get user personalization
  async getUserPersonalization(userId: string): Promise<UserPersonalization> {
    let personalization = this.personalizations.get(userId);
    
    if (!personalization) {
      personalization = this.createDefaultPersonalization(userId);
      this.personalizations.set(userId, personalization);
    }
    
    return personalization;
  }

  // Save dashboard customization
  async saveDashboardCustomization(
    userId: string,
    customization: DashboardCustomization
  ): Promise<void> {
    const personalization = await this.getUserPersonalization(userId);
    personalization.customizations[customization.dashboardId] = customization;
    await this.saveUserPersonalization(personalization);
  }

  // Get dashboard customization
  async getDashboardCustomization(
    userId: string,
    dashboardId: string
  ): Promise<DashboardCustomization | null> {
    const personalization = await this.getUserPersonalization(userId);
    return personalization.customizations[dashboardId] || null;
  }

  // Get available presets
  getPresets(category?: DashboardPreset['category']): DashboardPreset[] {
    const presets = Array.from(this.presets.values());
    
    if (category) {
      return presets.filter(preset => preset.category === category);
    }
    
    return presets.sort((a, b) => b.popularity - a.popularity);
  }

  // Apply preset to dashboard
  async applyPreset(
    userId: string,
    dashboardId: string,
    presetId: string,
    dashboard: DashboardTemplate
  ): Promise<DashboardCustomization> {
    const preset = this.presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`);
    }

    const existingCustomization = await this.getDashboardCustomization(userId, dashboardId);
    const baseCustomization = existingCustomization || this.createDefaultCustomization(userId, dashboardId, dashboard);

    const updatedCustomization: DashboardCustomization = {
      ...baseCustomization,
      ...preset.customization,
      id: baseCustomization.id,
      userId,
      dashboardId,
      updatedAt: new Date(),
    };

    await this.saveDashboardCustomization(userId, updatedCustomization);
    return updatedCustomization;
  }

  private async saveUserPersonalization(personalization: UserPersonalization): Promise<void> {
    personalization.updatedAt = new Date();
    this.personalizations.set(personalization.userId, personalization);
    
    // In a real app, save to backend
    localStorage.setItem(
      `personalization-${personalization.userId}`,
      JSON.stringify(personalization)
    );
  }

  private createDefaultPersonalization(userId: string): UserPersonalization {
    return {
      userId,
      preferences: {
        defaultTheme: 'light',
        defaultDensity: 'comfortable',
        enableAnimations: true,
        autoSave: true,
        showTips: true,
      },
      customizations: {},
      favoritePresets: [],
      recentlyUsed: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createDefaultCustomization(
    userId: string,
    dashboardId: string,
    dashboard: DashboardTemplate
  ): DashboardCustomization {
    return {
      id: `customization-${userId}-${dashboardId}`,
      userId,
      dashboardId,
      theme: {
        mode: 'light',
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        backgroundColor: '#fafafa',
        cardStyle: 'elevated',
        borderRadius: 4,
        density: 'comfortable',
      },
      layout: {
        columns: 12,
        rowHeight: 60,
        margin: [10, 10],
        padding: [16, 16],
        compactType: 'vertical',
        autoResize: true,
        snapToGrid: false,
      },
      widgets: dashboard.widgets.map((widget, index) => ({
        id: widget.id,
        visible: true,
        order: index,
      })),
      preferences: {
        autoRefresh: true,
        refreshInterval: 30000,
        showGridLines: false,
        showWidgetBorders: false,
        enableAnimations: true,
        compactMode: false,
        fullscreenMode: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

// Export singleton instance
export const dashboardPersonalizationService = DashboardPersonalizationService.getInstance();