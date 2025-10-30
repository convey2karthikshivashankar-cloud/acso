import { DashboardWidget } from '../components/dashboard/DashboardLayoutEngine';
import { DashboardCustomization } from '../components/dashboard/DashboardThemeProvider';

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'operational' | 'technical' | 'financial' | 'security';
  widgets: DashboardWidget[];
  customization: DashboardCustomization;
  isDefault?: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPersonalization {
  userId: string;
  preferences: {
    defaultPreset: string;
    favoriteWidgets: string[];
    hiddenWidgets: string[];
    customLayouts: Record<string, any>;
    notifications: {
      enabled: boolean;
      types: string[];
      frequency: 'realtime' | 'hourly' | 'daily';
    };
  };
  customization: Partial<DashboardCustomization>;
  lastUpdated: Date;
}

class DashboardPersonalizationService {
  private presets: DashboardPreset[] = [];
  private userPersonalizations: Map<string, UserPersonalization> = new Map();

  // Preset Management
  async getPresets(): Promise<DashboardPreset[]> {
    return this.presets;
  }

  async getPresetById(id: string): Promise<DashboardPreset | null> {
    return this.presets.find(preset => preset.id === id) || null;
  }

  async getPresetsByCategory(category: DashboardPreset['category']): Promise<DashboardPreset[]> {
    return this.presets.filter(preset => preset.category === category);
  }

  async createPreset(preset: Omit<DashboardPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<DashboardPreset> {
    const newPreset: DashboardPreset = {
      ...preset,
      id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.presets.push(newPreset);
    return newPreset;
  }

  async updatePreset(id: string, updates: Partial<DashboardPreset>): Promise<DashboardPreset | null> {
    const index = this.presets.findIndex(preset => preset.id === id);
    if (index === -1) return null;

    this.presets[index] = {
      ...this.presets[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.presets[index];
  }

  async deletePreset(id: string): Promise<boolean> {
    const index = this.presets.findIndex(preset => preset.id === id);
    if (index === -1) return false;

    this.presets.splice(index, 1);
    return true;
  }

  // User Personalization
  async getUserPersonalization(userId: string): Promise<UserPersonalization | null> {
    return this.userPersonalizations.get(userId) || null;
  }

  async saveUserPersonalization(personalization: UserPersonalization): Promise<void> {
    this.userPersonalizations.set(personalization.userId, {
      ...personalization,
      lastUpdated: new Date(),
    });
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPersonalization['preferences']>
  ): Promise<UserPersonalization | null> {
    const existing = this.userPersonalizations.get(userId);
    if (!existing) return null;

    const updated: UserPersonalization = {
      ...existing,
      preferences: {
        ...existing.preferences,
        ...preferences,
      },
      lastUpdated: new Date(),
    };

    this.userPersonalizations.set(userId, updated);
    return updated;
  }

  async updateUserCustomization(
    userId: string,
    customization: Partial<DashboardCustomization>
  ): Promise<UserPersonalization | null> {
    const existing = this.userPersonalizations.get(userId);
    if (!existing) return null;

    const updated: UserPersonalization = {
      ...existing,
      customization: {
        ...existing.customization,
        ...customization,
      },
      lastUpdated: new Date(),
    };

    this.userPersonalizations.set(userId, updated);
    return updated;
  }

  // Widget Management
  async addFavoriteWidget(userId: string, widgetId: string): Promise<boolean> {
    const personalization = this.userPersonalizations.get(userId);
    if (!personalization) return false;

    if (!personalization.preferences.favoriteWidgets.includes(widgetId)) {
      personalization.preferences.favoriteWidgets.push(widgetId);
      personalization.lastUpdated = new Date();
    }
    return true;
  }

  async removeFavoriteWidget(userId: string, widgetId: string): Promise<boolean> {
    const personalization = this.userPersonalizations.get(userId);
    if (!personalization) return false;

    const index = personalization.preferences.favoriteWidgets.indexOf(widgetId);
    if (index > -1) {
      personalization.preferences.favoriteWidgets.splice(index, 1);
      personalization.lastUpdated = new Date();
    }
    return true;
  }

  async hideWidget(userId: string, widgetId: string): Promise<boolean> {
    const personalization = this.userPersonalizations.get(userId);
    if (!personalization) return false;

    if (!personalization.preferences.hiddenWidgets.includes(widgetId)) {
      personalization.preferences.hiddenWidgets.push(widgetId);
      personalization.lastUpdated = new Date();
    }
    return true;
  }

  async showWidget(userId: string, widgetId: string): Promise<boolean> {
    const personalization = this.userPersonalizations.get(userId);
    if (!personalization) return false;

    const index = personalization.preferences.hiddenWidgets.indexOf(widgetId);
    if (index > -1) {
      personalization.preferences.hiddenWidgets.splice(index, 1);
      personalization.lastUpdated = new Date();
    }
    return true;
  }

  // Layout Management
  async saveCustomLayout(userId: string, layoutName: string, layout: any): Promise<boolean> {
    const personalization = this.userPersonalizations.get(userId);
    if (!personalization) return false;

    personalization.preferences.customLayouts[layoutName] = layout;
    personalization.lastUpdated = new Date();
    return true;
  }

  async deleteCustomLayout(userId: string, layoutName: string): Promise<boolean> {
    const personalization = this.userPersonalizations.get(userId);
    if (!personalization) return false;

    delete personalization.preferences.customLayouts[layoutName];
    personalization.lastUpdated = new Date();
    return true;
  }

  // Utility Methods
  async exportUserData(userId: string): Promise<string | null> {
    const personalization = this.userPersonalizations.get(userId);
    if (!personalization) return null;

    return JSON.stringify(personalization, null, 2);
  }

  async importUserData(userId: string, data: string): Promise<boolean> {
    try {
      const personalization: UserPersonalization = JSON.parse(data);
      personalization.userId = userId; // Ensure correct user ID
      personalization.lastUpdated = new Date();
      this.userPersonalizations.set(userId, personalization);
      return true;
    } catch (error) {
      console.error('Failed to import user data:', error);
      return false;
    }
  }

  async resetUserPersonalization(userId: string): Promise<boolean> {
    this.userPersonalizations.delete(userId);
    return true;
  }
}

export const dashboardPersonalizationService = new DashboardPersonalizationService();
export default dashboardPersonalizationService;