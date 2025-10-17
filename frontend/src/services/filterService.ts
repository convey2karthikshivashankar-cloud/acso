import { FilterTemplate, FilterGroup, FilterCondition } from '../components/search/AdvancedFilterBuilder';

export interface SavedFilter {
  id: string;
  name: string;
  description: string;
  filterGroup: FilterGroup;
  isShared: boolean;
  createdBy: string;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  tags: string[];
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  filterGroup: FilterGroup;
  isBuiltIn: boolean;
  popularity: number;
}

class FilterService {
  private savedFilters: SavedFilter[] = [];
  private filterTemplates: FilterTemplate[] = [];
  private filterPresets: FilterPreset[] = [];

  constructor() {
    this.initializeMockData();
    this.loadSavedFilters();
  }

  private initializeMockData() {
    // Built-in filter presets
    this.filterPresets = [
      {
        id: 'preset-1',
        name: 'Critical Security Incidents',
        description: 'High and critical severity security incidents from the last 30 days',
        category: 'Security',
        filterGroup: {
          id: 'root',
          name: 'Critical Security Filter',
          logic: 'AND',
          conditions: [
            {
              id: 'c1',
              field: 'type',
              operator: 'equals',
              value: 'incident',
              dataType: 'string',
            },
            {
              id: 'c2',
              field: 'category',
              operator: 'equals',
              value: 'Security',
              dataType: 'string',
            },
            {
              id: 'c3',
              field: 'severity',
              operator: 'in',
              value: ['high', 'critical'],
              dataType: 'array',
            },
            {
              id: 'c4',
              field: 'date',
              operator: 'greaterThan',
              value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              dataType: 'date',
            },
          ],
        },
        isBuiltIn: true,
        popularity: 85,
      },
      {
        id: 'preset-2',
        name: 'Active Agents',
        description: 'All currently active and healthy agents',
        category: 'System',
        filterGroup: {
          id: 'root',
          name: 'Active Agents Filter',
          logic: 'AND',
          conditions: [
            {
              id: 'c1',
              field: 'type',
              operator: 'equals',
              value: 'agent',
              dataType: 'string',
            },
            {
              id: 'c2',
              field: 'status',
              operator: 'equals',
              value: 'active',
              dataType: 'string',
            },
            {
              id: 'c3',
              field: 'health',
              operator: 'equals',
              value: 'healthy',
              dataType: 'string',
            },
          ],
        },
        isBuiltIn: true,
        popularity: 72,
      },
      {
        id: 'preset-3',
        name: 'High Cost Resources',
        description: 'Resources with costs above $1000 in the current month',
        category: 'Financial',
        filterGroup: {
          id: 'root',
          name: 'High Cost Filter',
          logic: 'AND',
          conditions: [
            {
              id: 'c1',
              field: 'type',
              operator: 'equals',
              value: 'financial',
              dataType: 'string',
            },
            {
              id: 'c2',
              field: 'cost',
              operator: 'greaterThan',
              value: 1000,
              dataType: 'number',
            },
            {
              id: 'c3',
              field: 'date',
              operator: 'greaterThan',
              value: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
              dataType: 'date',
            },
          ],
        },
        isBuiltIn: true,
        popularity: 58,
      },
    ];

    // Sample filter templates
    this.filterTemplates = [
      {
        id: 'template-1',
        name: 'Recent Workflow Executions',
        description: 'Workflows executed in the last 7 days with success or failure status',
        category: 'Operations',
        filterGroup: {
          id: 'root',
          name: 'Recent Workflows',
          logic: 'AND',
          conditions: [
            {
              id: 'c1',
              field: 'type',
              operator: 'equals',
              value: 'workflow',
              dataType: 'string',
            },
            {
              id: 'c2',
              field: 'date',
              operator: 'greaterThan',
              value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              dataType: 'date',
            },
          ],
          subGroups: [
            {
              id: 'sg1',
              name: 'Status Group',
              logic: 'OR',
              conditions: [
                {
                  id: 'c3',
                  field: 'status',
                  operator: 'equals',
                  value: 'success',
                  dataType: 'string',
                },
                {
                  id: 'c4',
                  field: 'status',
                  operator: 'equals',
                  value: 'failure',
                  dataType: 'string',
                },
              ],
            },
          ],
        },
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date('2024-01-01'),
        usageCount: 45,
        tags: ['workflow', 'recent', 'status'],
      },
    ];
  }

  private loadSavedFilters() {
    try {
      const saved = localStorage.getItem('savedFilters');
      if (saved) {
        this.savedFilters = JSON.parse(saved).map((filter: any) => ({
          ...filter,
          createdAt: new Date(filter.createdAt),
          lastUsed: new Date(filter.lastUsed),
        }));
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  }

  private saveSavedFilters() {
    try {
      localStorage.setItem('savedFilters', JSON.stringify(this.savedFilters));
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  }

  async getFilterPresets(): Promise<FilterPreset[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return [...this.filterPresets].sort((a, b) => b.popularity - a.popularity);
  }

  async getFilterTemplates(category?: string): Promise<FilterTemplate[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let templates = [...this.filterTemplates];
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  async getSavedFilters(userId?: string): Promise<SavedFilter[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let filters = [...this.savedFilters];
    
    if (userId) {
      filters = filters.filter(f => f.createdBy === userId || f.isShared);
    }
    
    return filters.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  async saveFilter(filter: Omit<SavedFilter, 'id' | 'createdAt' | 'lastUsed' | 'usageCount'>): Promise<SavedFilter> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newFilter: SavedFilter = {
      ...filter,
      id: Date.now().toString(),
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
    };
    
    this.savedFilters.push(newFilter);
    this.saveSavedFilters();
    
    return newFilter;
  }

  async updateFilter(filterId: string, updates: Partial<SavedFilter>): Promise<SavedFilter> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const filterIndex = this.savedFilters.findIndex(f => f.id === filterId);
    if (filterIndex === -1) {
      throw new Error('Filter not found');
    }
    
    this.savedFilters[filterIndex] = {
      ...this.savedFilters[filterIndex],
      ...updates,
    };
    
    this.saveSavedFilters();
    return this.savedFilters[filterIndex];
  }

  async deleteFilter(filterId: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.savedFilters = this.savedFilters.filter(f => f.id !== filterId);
    this.saveSavedFilters();
  }

  async saveTemplate(template: Omit<FilterTemplate, 'id' | 'createdAt' | 'usageCount'>): Promise<FilterTemplate> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newTemplate: FilterTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date(),
      usageCount: 0,
    };
    
    this.filterTemplates.push(newTemplate);
    
    return newTemplate;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.filterTemplates = this.filterTemplates.filter(t => t.id !== templateId);
  }

  async shareFilter(filterId: string, userIds: string[]): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const filter = this.savedFilters.find(f => f.id === filterId);
    if (filter) {
      filter.isShared = true;
    }
    
    this.saveSavedFilters();
    
    // In a real implementation, this would notify the specified users
    console.log('Filter shared with users:', userIds);
  }

  async duplicateFilter(filterId: string, newName: string): Promise<SavedFilter> {
    const originalFilter = this.savedFilters.find(f => f.id === filterId);
    if (!originalFilter) {
      throw new Error('Filter not found');
    }
    
    return this.saveFilter({
      name: newName,
      description: `Copy of ${originalFilter.description}`,
      filterGroup: JSON.parse(JSON.stringify(originalFilter.filterGroup)), // Deep copy
      isShared: false,
      createdBy: 'current-user',
      tags: [...originalFilter.tags],
    });
  }

  async exportFilter(filterId: string, format: 'json' | 'yaml'): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const filter = this.savedFilters.find(f => f.id === filterId);
    if (!filter) {
      throw new Error('Filter not found');
    }
    
    if (format === 'json') {
      return JSON.stringify(filter, null, 2);
    } else {
      // Simple YAML-like format
      return `name: ${filter.name}
description: ${filter.description}
created_by: ${filter.createdBy}
created_at: ${filter.createdAt.toISOString()}
tags: [${filter.tags.join(', ')}]
filter:
  ${JSON.stringify(filter.filterGroup, null, 2).replace(/\n/g, '\n  ')}`;
    }
  }

  async importFilter(filterData: string, format: 'json' | 'yaml'): Promise<SavedFilter> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filterObj: any;
    
    if (format === 'json') {
      filterObj = JSON.parse(filterData);
    } else {
      // Simple YAML parsing (in a real app, use a proper YAML parser)
      throw new Error('YAML import not implemented in this demo');
    }
    
    return this.saveFilter({
      name: filterObj.name || 'Imported Filter',
      description: filterObj.description || 'Imported from external source',
      filterGroup: filterObj.filterGroup || filterObj.filter,
      isShared: false,
      createdBy: 'current-user',
      tags: filterObj.tags || [],
    });
  }

  async getFilterUsageAnalytics(): Promise<{
    mostUsedFilters: { filter: SavedFilter; usageCount: number }[];
    mostUsedTemplates: { template: FilterTemplate; usageCount: number }[];
    filtersByCategory: { category: string; count: number }[];
    usageTrends: { date: Date; count: number }[];
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const mostUsedFilters = this.savedFilters
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(filter => ({ filter, usageCount: filter.usageCount }));
    
    const mostUsedTemplates = this.filterTemplates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(template => ({ template, usageCount: template.usageCount }));
    
    const categoryCount = [...this.savedFilters, ...this.filterTemplates].reduce((acc, item) => {
      const category = 'category' in item ? item.category : 'General';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const filtersByCategory = Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count,
    }));
    
    // Mock usage trends
    const usageTrends = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      count: Math.floor(Math.random() * 20) + 5,
    })).reverse();
    
    return {
      mostUsedFilters,
      mostUsedTemplates,
      filtersByCategory,
      usageTrends,
    };
  }

  // Utility method to validate filter conditions
  validateFilter(filterGroup: FilterGroup): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const validateGroup = (group: FilterGroup, path: string = '') => {
      if (group.conditions.length === 0 && (!group.subGroups || group.subGroups.length === 0)) {
        errors.push(`${path}Group "${group.name}" has no conditions or sub-groups`);
      }
      
      group.conditions.forEach((condition, index) => {
        if (!condition.field) {
          errors.push(`${path}Condition ${index + 1}: Field is required`);
        }
        
        if (!condition.operator) {
          errors.push(`${path}Condition ${index + 1}: Operator is required`);
        }
        
        if (condition.operator !== 'exists' && condition.operator !== 'notExists') {
          if (condition.value === null || condition.value === undefined || condition.value === '') {
            errors.push(`${path}Condition ${index + 1}: Value is required for operator "${condition.operator}"`);
          }
        }
        
        if (condition.operator === 'between' && Array.isArray(condition.value)) {
          if (condition.value.length !== 2 || condition.value.some(v => v === null || v === undefined || v === '')) {
            errors.push(`${path}Condition ${index + 1}: Between operator requires two values`);
          }
        }
      });
      
      group.subGroups?.forEach((subGroup, index) => {
        validateGroup(subGroup, `${path}SubGroup ${index + 1} > `);
      });
    };
    
    validateGroup(filterGroup);
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Convert filter to SQL-like query string (for display purposes)
  filterToQueryString(filterGroup: FilterGroup): string {
    const buildQuery = (group: FilterGroup): string => {
      const conditions = group.conditions.map(condition => {
        let operator = condition.operator;
        let value = condition.value;
        
        switch (condition.operator) {
          case 'equals':
            operator = '=';
            break;
          case 'contains':
            operator = 'LIKE';
            value = `%${value}%`;
            break;
          case 'startsWith':
            operator = 'LIKE';
            value = `${value}%`;
            break;
          case 'endsWith':
            operator = 'LIKE';
            value = `%${value}`;
            break;
          case 'greaterThan':
            operator = '>';
            break;
          case 'lessThan':
            operator = '<';
            break;
          case 'between':
            return `${condition.field} BETWEEN ${value[0]} AND ${value[1]}`;
          case 'in':
            return `${condition.field} IN (${Array.isArray(value) ? value.map(v => `'${v}'`).join(', ') : value})`;
          case 'notIn':
            return `${condition.field} NOT IN (${Array.isArray(value) ? value.map(v => `'${v}'`).join(', ') : value})`;
          case 'exists':
            return `${condition.field} IS NOT NULL`;
          case 'notExists':
            return `${condition.field} IS NULL`;
        }
        
        return `${condition.field} ${operator} '${value}'`;
      });
      
      const subGroupQueries = group.subGroups?.map(subGroup => `(${buildQuery(subGroup)})`) || [];
      
      const allParts = [...conditions, ...subGroupQueries];
      return allParts.join(` ${group.logic} `);
    };
    
    return buildQuery(filterGroup);
  }
}

export const filterService = new FilterService();