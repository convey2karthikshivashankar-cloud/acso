import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DashboardCustomization {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  backgroundColor: string;
  widgetBackground: string;
  textColor: string;
  borderRadius: number;
  spacing: number;
  fontFamily: string;
  fontSize: number;
}

export interface DashboardCustomizationContextType {
  customization: DashboardCustomization;
  updateCustomization: (updates: Partial<DashboardCustomization>) => void;
  resetToDefault: () => void;
}

const defaultCustomization: DashboardCustomization = {
  theme: 'light',
  primaryColor: '#1976d2',
  backgroundColor: '#f5f5f5',
  widgetBackground: '#ffffff',
  textColor: '#333333',
  borderRadius: 8,
  spacing: 16,
  fontFamily: 'Roboto, Arial, sans-serif',
  fontSize: 14,
};

const DashboardCustomizationContext = createContext<DashboardCustomizationContextType | undefined>(undefined);

export interface DashboardCustomizationProviderProps {
  children: ReactNode;
  initialCustomization?: Partial<DashboardCustomization>;
}

export const DashboardCustomizationProvider: React.FC<DashboardCustomizationProviderProps> = ({
  children,
  initialCustomization = {},
}) => {
  const [customization, setCustomization] = useState<DashboardCustomization>({
    ...defaultCustomization,
    ...initialCustomization,
  });

  const updateCustomization = (updates: Partial<DashboardCustomization>) => {
    setCustomization(prev => ({ ...prev, ...updates }));
  };

  const resetToDefault = () => {
    setCustomization(defaultCustomization);
  };

  return (
    <DashboardCustomizationContext.Provider
      value={{
        customization,
        updateCustomization,
        resetToDefault,
      }}
    >
      {children}
    </DashboardCustomizationContext.Provider>
  );
};

export const useDashboardCustomization = () => {
  const context = useContext(DashboardCustomizationContext);
  if (!context) {
    throw new Error('useDashboardCustomization must be used within a DashboardCustomizationProvider');
  }
  return context;
};

export const createDefaultCustomization = (): DashboardCustomization => ({
  ...defaultCustomization,
});

// Theme Provider Component
export interface DashboardThemeProviderProps {
  children: ReactNode;
  customization?: DashboardCustomization;
}

export const DashboardThemeProvider: React.FC<DashboardThemeProviderProps> = ({
  children,
  customization = defaultCustomization,
}) => {
  const themeStyles = {
    '--dashboard-primary-color': customization.primaryColor,
    '--dashboard-background-color': customization.backgroundColor,
    '--dashboard-widget-background': customization.widgetBackground,
    '--dashboard-text-color': customization.textColor,
    '--dashboard-border-radius': `${customization.borderRadius}px`,
    '--dashboard-spacing': `${customization.spacing}px`,
    '--dashboard-font-family': customization.fontFamily,
    '--dashboard-font-size': `${customization.fontSize}px`,
  } as React.CSSProperties;

  return (
    <div style={themeStyles} className="dashboard-theme-provider">
      {children}
    </div>
  );
};