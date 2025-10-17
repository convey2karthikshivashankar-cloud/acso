import React from 'react';
import { ChartDataPoint } from './BaseChart';
import { ChartFilter } from './InteractiveChart';

export interface ChartLinkDefinition {
  id: string;
  sourceChartId: string;
  targetChartId: string;
  type: 'filter' | 'highlight' | 'zoom' | 'selection' | 'brush';
  mapping: Record<string, string>;
  bidirectional?: boolean;
  enabled?: boolean;
}

export interface ChartLinkEvent {
  sourceChartId: string;
  type: string;
  data: any;
  timestamp: Date;
}

export interface LinkedChartState {
  chartId: string;
  selectedData: ChartDataPoint[];
  highlightedData: ChartDataPoint[];
  activeFilters: ChartFilter[];
  zoomRange: { start: number; end: number } | null;
  brushRange: { start: number; end: number } | null;
}

export class ChartLinkingManager {
  private static instance: ChartLinkingManager;
  private links: Map<string, ChartLinkDefinition> = new Map();
  private chartStates: Map<string, LinkedChartState> = new Map();
  private eventListeners: Map<string, Array<(event: ChartLinkEvent) => void>> = new Map();

  static getInstance(): ChartLinkingManager {
    if (!ChartLinkingManager.instance) {
      ChartLinkingManager.instance = new ChartLinkingManager();
    }
    return ChartLinkingManager.instance;
  }

  // Register a chart link
  registerLink(link: ChartLinkDefinition): void {
    this.links.set(link.id, link);
  }

  // Unregister a chart link
  unregisterLink(linkId: string): void {
    this.links.delete(linkId);
  }

  // Register a chart for linking
  registerChart(chartId: string, initialState?: Partial<LinkedChartState>): void {
    this.chartStates.set(chartId, {
      chartId,
      selectedData: [],
      highlightedData: [],
      activeFilters: [],
      zoomRange: null,
      brushRange: null,
      ...initialState,
    });
  }

  // Unregister a chart
  unregisterChart(chartId: string): void {
    this.chartStates.delete(chartId);
    this.eventListeners.delete(chartId);
  }

  // Add event listener for a chart
  addEventListener(chartId: string, listener: (event: ChartLinkEvent) => void): void {
    if (!this.eventListeners.has(chartId)) {
      this.eventListeners.set(chartId, []);
    }
    this.eventListeners.get(chartId)!.push(listener);
  }

  // Remove event listener
  removeEventListener(chartId: string, listener: (event: ChartLinkEvent) => void): void {
    const listeners = this.eventListeners.get(chartId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit an event from a chart
  emitEvent(sourceChartId: string, type: string, data: any): void {
    const event: ChartLinkEvent = {
      sourceChartId,
      type,
      data,
      timestamp: new Date(),
    };

    // Update source chart state
    this.updateChartState(sourceChartId, type, data);

    // Find and process linked charts
    const relevantLinks = Array.from(this.links.values()).filter(
      link => link.sourceChartId === sourceChartId && link.enabled !== false
    );

    relevantLinks.forEach(link => {
      if (this.shouldProcessLink(link, type)) {
        this.processLink(link, event);
      }
    });

    // Handle bidirectional links
    const bidirectionalLinks = Array.from(this.links.values()).filter(
      link => link.targetChartId === sourceChartId && link.bidirectional && link.enabled !== false
    );

    bidirectionalLinks.forEach(link => {
      if (this.shouldProcessLink(link, type)) {
        const reversedEvent = { ...event, sourceChartId: link.targetChartId };
        this.processLink(
          { ...link, sourceChartId: link.targetChartId, targetChartId: link.sourceChartId },
          reversedEvent
        );
      }
    });
  }

  // Update chart state
  private updateChartState(chartId: string, type: string, data: any): void {
    const state = this.chartStates.get(chartId);
    if (!state) return;

    switch (type) {
      case 'selection':
        state.selectedData = data.selected || [];
        break;
      case 'highlight':
        state.highlightedData = data.highlighted || [];
        break;
      case 'filter':
        state.activeFilters = data.filters || [];
        break;
      case 'zoom':
      case 'zoom_range':
        state.zoomRange = data.range || null;
        break;
      case 'brush':
        state.brushRange = data.range || null;
        break;
    }
  }

  // Check if a link should be processed for a given event type
  private shouldProcessLink(link: ChartLinkDefinition, eventType: string): boolean {
    switch (link.type) {
      case 'filter':
        return eventType === 'selection' || eventType === 'filter';
      case 'highlight':
        return eventType === 'hover' || eventType === 'selection';
      case 'zoom':
        return eventType === 'zoom' || eventType === 'zoom_range';
      case 'selection':
        return eventType === 'selection';
      case 'brush':
        return eventType === 'brush';
      default:
        return false;
    }
  }

  // Process a chart link
  private processLink(link: ChartLinkDefinition, event: ChartLinkEvent): void {
    const targetState = this.chartStates.get(link.targetChartId);
    if (!targetState) return;

    const transformedData = this.transformData(event.data, link.mapping);
    const targetEvent: ChartLinkEvent = {
      sourceChartId: event.sourceChartId,
      type: link.type,
      data: transformedData,
      timestamp: event.timestamp,
    };

    // Update target chart state
    this.updateChartState(link.targetChartId, link.type, transformedData);

    // Notify target chart listeners
    const listeners = this.eventListeners.get(link.targetChartId);
    if (listeners) {
      listeners.forEach(listener => listener(targetEvent));
    }
  }

  // Transform data based on field mapping
  private transformData(data: any, mapping: Record<string, string>): any {
    if (!data || typeof data !== 'object') return data;

    const transformed = { ...data };

    // Apply field mappings
    Object.entries(mapping).forEach(([sourceField, targetField]) => {
      if (data[sourceField] !== undefined) {
        transformed[targetField] = data[sourceField];
        if (sourceField !== targetField) {
          delete transformed[sourceField];
        }
      }
    });

    // Handle arrays of data points
    if (data.selected && Array.isArray(data.selected)) {
      transformed.selected = data.selected.map((item: any) => {
        const transformedItem = { ...item };
        Object.entries(mapping).forEach(([sourceField, targetField]) => {
          if (item[sourceField] !== undefined) {
            transformedItem[targetField] = item[sourceField];
            if (sourceField !== targetField) {
              delete transformedItem[sourceField];
            }
          }
        });
        return transformedItem;
      });
    }

    return transformed;
  }

  // Get current state of a chart
  getChartState(chartId: string): LinkedChartState | null {
    return this.chartStates.get(chartId) || null;
  }

  // Get all links for a chart
  getLinksForChart(chartId: string): ChartLinkDefinition[] {
    return Array.from(this.links.values()).filter(
      link => link.sourceChartId === chartId || link.targetChartId === chartId
    );
  }

  // Enable/disable a link
  setLinkEnabled(linkId: string, enabled: boolean): void {
    const link = this.links.get(linkId);
    if (link) {
      link.enabled = enabled;
    }
  }

  // Clear all states
  clearAllStates(): void {
    this.chartStates.forEach(state => {
      state.selectedData = [];
      state.highlightedData = [];
      state.activeFilters = [];
      state.zoomRange = null;
      state.brushRange = null;
    });
  }

  // Get linking statistics
  getLinkingStats(): {
    totalLinks: number;
    activeLinks: number;
    registeredCharts: number;
    eventListeners: number;
  } {
    const activeLinks = Array.from(this.links.values()).filter(link => link.enabled !== false).length;
    const totalEventListeners = Array.from(this.eventListeners.values())
      .reduce((total, listeners) => total + listeners.length, 0);

    return {
      totalLinks: this.links.size,
      activeLinks,
      registeredCharts: this.chartStates.size,
      eventListeners: totalEventListeners,
    };
  }
}

// React hook for chart linking
export const useChartLinking = (chartId: string) => {
  const [linkingState, setLinkingState] = React.useState<LinkedChartState | null>(null);
  const linkingManager = React.useMemo(() => ChartLinkingManager.getInstance(), []);

  React.useEffect(() => {
    // Register chart
    linkingManager.registerChart(chartId);

    // Add event listener
    const handleLinkEvent = (event: ChartLinkEvent) => {
      const state = linkingManager.getChartState(chartId);
      setLinkingState(state);
    };

    linkingManager.addEventListener(chartId, handleLinkEvent);

    // Initial state
    const initialState = linkingManager.getChartState(chartId);
    setLinkingState(initialState);

    return () => {
      linkingManager.removeEventListener(chartId, handleLinkEvent);
      linkingManager.unregisterChart(chartId);
    };
  }, [chartId, linkingManager]);

  const emitEvent = React.useCallback((type: string, data: any) => {
    linkingManager.emitEvent(chartId, type, data);
  }, [chartId, linkingManager]);

  const getLinks = React.useCallback(() => {
    return linkingManager.getLinksForChart(chartId);
  }, [chartId, linkingManager]);

  return {
    linkingState,
    emitEvent,
    getLinks,
    linkingManager,
  };
};

// Predefined link configurations
export const createFilterLink = (
  sourceChartId: string,
  targetChartId: string,
  fieldMapping: Record<string, string> = {}
): ChartLinkDefinition => ({
  id: `filter-${sourceChartId}-${targetChartId}`,
  sourceChartId,
  targetChartId,
  type: 'filter',
  mapping: fieldMapping,
  bidirectional: false,
  enabled: true,
});

export const createHighlightLink = (
  sourceChartId: string,
  targetChartId: string,
  fieldMapping: Record<string, string> = {}
): ChartLinkDefinition => ({
  id: `highlight-${sourceChartId}-${targetChartId}`,
  sourceChartId,
  targetChartId,
  type: 'highlight',
  mapping: fieldMapping,
  bidirectional: true,
  enabled: true,
});

export const createZoomLink = (
  sourceChartId: string,
  targetChartId: string,
  fieldMapping: Record<string, string> = {}
): ChartLinkDefinition => ({
  id: `zoom-${sourceChartId}-${targetChartId}`,
  sourceChartId,
  targetChartId,
  type: 'zoom',
  mapping: fieldMapping,
  bidirectional: false,
  enabled: true,
});

export const createBrushLink = (
  sourceChartId: string,
  targetChartId: string,
  fieldMapping: Record<string, string> = {}
): ChartLinkDefinition => ({
  id: `brush-${sourceChartId}-${targetChartId}`,
  sourceChartId,
  targetChartId,
  type: 'brush',
  mapping: fieldMapping,
  bidirectional: false,
  enabled: true,
});

// Export singleton instance
export const chartLinkingManager = ChartLinkingManager.getInstance();