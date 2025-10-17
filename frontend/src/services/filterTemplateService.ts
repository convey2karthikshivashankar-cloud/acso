import { FilterTemplate, FilterGroup } from '../components/search/FilterBuilder';

interface FilterTemplateStorage {
  templates: FilterTemplate[];
  lastUpdated: number;
}

class FilterTemplateService {
  private storageKey = 'filter_templates';
  private templates: FilterTemplate[] = [];

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data: FilterTemplateStorage = JSON.parse(stored);
        this.templates = data.templates.map(template => ({
          ...template,
          createdAt: new Date(template.createdAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load filter templates:', error);
      this.templates = [];
    }
  }

  private saveTemplates(): void {
    try {
      const data: FilterTemplateStorage = {
        templates: this.templates,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save filter templates:', error);
    }
  }

  // Get all templates
  getTemplates(): FilterTemplate[] {
    return [...this.templates];
  }

  // Get templates by user
  getTemplatesByUser(userId: string): FilterTemplate[] {
    return this.templates.filter(template => template.createdBy === userId);
  }

  // Get public templates
  getPublicTemplates(): FilterTemplate[] {
    return this.templates.filter(template => template.isPublic);
  }

  // Get templates by tags
  getTemplatesByTags(tags: string[]): FilterTemplate[] {
    return this.templates.filter(template =>
      tags.some(tag => template.tags.includes(tag))
    );
  }

  // Search templates
  searchTemplates(query: string): FilterTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Get template by ID
  getTemplate(id: string): FilterTemplate | null {
    return this.templates.find(template => template.id === id) || null;
  }

  // Create new template
  createTemplate(templateData: Omit<FilterTemplate, 'id' | 'createdAt'>): FilterTemplate {
    const template: FilterTemplate = {
      ...templateData,
      id: this.generateId(),
      createdAt: new Date(),
    };

    this.templates.push(template);
    this.saveTemplates();
    return template;
  }

  // Update template
  updateTemplate(id: string, updates: Partial<Omit<FilterTemplate, 'id' | 'createdAt'>>): FilterTemplate | null {
    const index = this.templates.findIndex(template => template.id === id);
    if (index === -1) return null;

    this.templates[index] = {
      ...this.templates[index],
      ...updates,
    };

    this.saveTemplates();
    return this.templates[index];
  }

  // Delete template
  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(template => template.id === id);
    if (index === -1) return false;

    this.templates.splice(index, 1);
    this.saveTemplates();
    return true;
  }

  // Clone template
  cloneTemplate(id: string, newName?: string): FilterTemplate | null {
    const original = this.getTemplate(id);
    if (!original) return null;

    const cloned = this.createTemplate({
      ...original,
      name: newName || `${original.name} (Copy)`,
      isPublic: false, // Cloned templates are private by default
    });

    return cloned;
  }

  // Export templates
  exportTemplates(templateIds?: string[]): string {
    const templatesToExport = templateIds
      ? this.templates.filter(template => templateIds.includes(template.id))
      : this.templates;

    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: templatesToExport,
    }, null, 2);
  }

  // Import templates
  importTemplates(jsonData: string, overwrite = false): {
    imported: number;
    skipped: number;
    errors: string[];
  } {
    const result = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      const data = JSON.parse(jsonData);
      
      if (!data.templates || !Array.isArray(data.templates)) {
        result.errors.push('Invalid import format: templates array not found');
        return result;
      }

      for (const templateData of data.templates) {
        try {
          // Validate template structure
          if (!this.validateTemplateStructure(templateData)) {
            result.errors.push(`Invalid template structure: ${templateData.name || 'Unknown'}`);
            continue;
          }

          // Check if template already exists
          const existingTemplate = this.templates.find(t => t.name === templateData.name);
          
          if (existingTemplate && !overwrite) {
            result.skipped++;
            continue;
          }

          if (existingTemplate && overwrite) {
            // Update existing template
            this.updateTemplate(existingTemplate.id, {
              description: templateData.description,
              filter: templateData.filter,
              tags: templateData.tags,
              isPublic: templateData.isPublic,
            });
          } else {
            // Create new template
            this.createTemplate({
              name: templateData.name,
              description: templateData.description,
              filter: templateData.filter,
              isPublic: templateData.isPublic || false,
              createdBy: templateData.createdBy || 'imported',
              tags: templateData.tags || [],
            });
          }

          result.imported++;
        } catch (error) {
          result.errors.push(`Failed to import template: ${error}`);
        }
      }

      this.saveTemplates();
    } catch (error) {
      result.errors.push(`Failed to parse import data: ${error}`);
    }

    return result;
  }

  // Validate template structure
  private validateTemplateStructure(template: any): boolean {
    return (
      typeof template.name === 'string' &&
      typeof template.description === 'string' &&
      template.filter &&
      typeof template.filter === 'object' &&
      this.validateFilterGroup(template.filter)
    );
  }

  // Validate filter group structure
  private validateFilterGroup(group: any): boolean {
    return (
      typeof group.id === 'string' &&
      (group.logic === 'AND' || group.logic === 'OR') &&
      Array.isArray(group.conditions) &&
      Array.isArray(group.groups) &&
      group.conditions.every((condition: any) => this.validateFilterCondition(condition)) &&
      group.groups.every((subGroup: any) => this.validateFilterGroup(subGroup))
    );
  }

  // Validate filter condition structure
  private validateFilterCondition(condition: any): boolean {
    return (
      typeof condition.id === 'string' &&
      typeof condition.field === 'string' &&
      typeof condition.operator === 'string' &&
      ['string', 'number', 'date', 'boolean', 'array'].includes(condition.type)
    );
  }

  // Get template statistics
  getTemplateStats(): {
    total: number;
    public: number;
    private: number;
    byUser: Record<string, number>;
    byTag: Record<string, number>;
  } {
    const stats = {
      total: this.templates.length,
      public: 0,
      private: 0,
      byUser: {} as Record<string, number>,
      byTag: {} as Record<string, number>,
    };

    this.templates.forEach(template => {
      if (template.isPublic) {
        stats.public++;
      } else {
        stats.private++;
      }

      // Count by user
      stats.byUser[template.createdBy] = (stats.byUser[template.createdBy] || 0) + 1;

      // Count by tags
      template.tags.forEach(tag => {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      });
    });

    return stats;
  }

  // Get popular templates (by usage - would need usage tracking)
  getPopularTemplates(limit = 10): FilterTemplate[] {
    // For now, return most recent templates
    // In a real implementation, you'd track usage and sort by that
    return [...this.templates]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Get recommended templates based on current filter
  getRecommendedTemplates(currentFilter: FilterGroup, limit = 5): FilterTemplate[] {
    // Simple recommendation based on similar fields used
    const currentFields = this.extractFieldsFromFilter(currentFilter);
    
    if (currentFields.length === 0) {
      return this.getPopularTemplates(limit);
    }

    const scored = this.templates.map(template => {
      const templateFields = this.extractFieldsFromFilter(template.filter);
      const commonFields = currentFields.filter(field => templateFields.includes(field));
      const score = commonFields.length / Math.max(currentFields.length, templateFields.length);
      
      return { template, score };
    });

    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.template);
  }

  // Extract fields from filter group
  private extractFieldsFromFilter(group: FilterGroup): string[] {
    const fields = new Set<string>();
    
    group.conditions.forEach(condition => {
      fields.add(condition.field);
    });
    
    group.groups.forEach(subGroup => {
      this.extractFieldsFromFilter(subGroup).forEach(field => fields.add(field));
    });
    
    return Array.from(fields);
  }

  // Generate unique ID
  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clear all templates (for testing/reset)
  clearAllTemplates(): void {
    this.templates = [];
    this.saveTemplates();
  }

  // Backup templates to file
  async backupTemplates(): Promise<void> {
    const backup = this.exportTemplates();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `filter-templates-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Restore templates from file
  async restoreTemplates(file: File, overwrite = false): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const result = this.importTemplates(content, overwrite);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// Create singleton instance
export const filterTemplateService = new FilterTemplateService();

// React hook for filter templates
export const useFilterTemplates = () => {
  const [templates, setTemplates] = React.useState<FilterTemplate[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setTemplates(filterTemplateService.getTemplates());
  }, []);

  const refreshTemplates = React.useCallback(() => {
    setTemplates(filterTemplateService.getTemplates());
  }, []);

  const createTemplate = React.useCallback(async (templateData: Omit<FilterTemplate, 'id' | 'createdAt'>) => {
    setLoading(true);
    try {
      const template = filterTemplateService.createTemplate(templateData);
      refreshTemplates();
      return template;
    } finally {
      setLoading(false);
    }
  }, [refreshTemplates]);

  const updateTemplate = React.useCallback(async (id: string, updates: Partial<Omit<FilterTemplate, 'id' | 'createdAt'>>) => {
    setLoading(true);
    try {
      const template = filterTemplateService.updateTemplate(id, updates);
      refreshTemplates();
      return template;
    } finally {
      setLoading(false);
    }
  }, [refreshTemplates]);

  const deleteTemplate = React.useCallback(async (id: string) => {
    setLoading(true);
    try {
      const success = filterTemplateService.deleteTemplate(id);
      if (success) {
        refreshTemplates();
      }
      return success;
    } finally {
      setLoading(false);
    }
  }, [refreshTemplates]);

  const searchTemplates = React.useCallback((query: string) => {
    return filterTemplateService.searchTemplates(query);
  }, []);

  const getRecommendedTemplates = React.useCallback((currentFilter: FilterGroup, limit?: number) => {
    return filterTemplateService.getRecommendedTemplates(currentFilter, limit);
  }, []);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    searchTemplates,
    getRecommendedTemplates,
    refreshTemplates,
  };
};

export default filterTemplateService;