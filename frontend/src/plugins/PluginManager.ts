interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  permissions?: string[];
  extensionPoints?: string[];
  main: string;
  icon?: string;
  screenshots?: string[];
  minAppVersion?: string;
  maxAppVersion?: string;
}

interface PluginContext {
  api: PluginAPI;
  config: Record<string, any>;
  storage: PluginStorage;
  logger: PluginLogger;
  events: PluginEventEmitter;
}

interface PluginAPI {
  // Core API methods available to plugins
  registerComponent: (name: string, component: React.ComponentType) => void;
  registerRoute: (path: string, component: React.ComponentType) => void;
  registerMenuItem: (item: MenuItem) => void;
  registerWidget: (widget: WidgetDefinition) => void;
  registerTheme: (theme: ThemeDefinition) => void;
  registerCommand: (command: CommandDefinition) => void;
  registerHook: (name: string, callback: Function) => void;
  unregisterHook: (name: string, callback: Function) => void;
  executeHook: (name: string, ...args: any[]) => Promise<any[]>;
  getAppVersion: () => string;
  getUser: () => any;
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  showModal: (component: React.ComponentType, props?: any) => Promise<any>;
  navigate: (path: string) => void;
  makeRequest: (url: string, options?: RequestInit) => Promise<Response>;
}

interface PluginStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
}

interface PluginLogger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

interface PluginEventEmitter {
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
  emit: (event: string, ...args: any[]) => void;
  once: (event: string, callback: Function) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  action?: () => void;
  children?: MenuItem[];
  permissions?: string[];
}

interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType;
  defaultProps?: any;
  configSchema?: any;
  permissions?: string[];
}

interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  colors: Record<string, string>;
  typography?: any;
  components?: any;
}

interface CommandDefinition {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  action: (args?: any) => void | Promise<void>;
  permissions?: string[];
}

interface Plugin {
  manifest: PluginManifest;
  instance?: any;
  context?: PluginContext;
  status: 'loading' | 'active' | 'inactive' | 'error';
  error?: string;
  loadTime?: number;
}

class PluginManager {
  private plugins = new Map<string, Plugin>();
  private hooks = new Map<string, Function[]>();
  private components = new Map<string, React.ComponentType>();
  private routes = new Map<string, React.ComponentType>();
  private menuItems: MenuItem[] = [];
  private widgets = new Map<string, WidgetDefinition>();
  private themes = new Map<string, ThemeDefinition>();
  private commands = new Map<string, CommandDefinition>();
  private eventEmitter = new EventTarget();
  private sandboxes = new Map<string, any>();

  constructor() {
    this.initializeAPI();
  }

  private initializeAPI(): void {
    // Initialize core plugin API
    this.registerCoreHooks();
    this.setupSecuritySandbox();
  }

  private registerCoreHooks(): void {
    // Core application hooks
    this.hooks.set('app:init', []);
    this.hooks.set('app:ready', []);
    this.hooks.set('app:destroy', []);
    this.hooks.set('user:login', []);
    this.hooks.set('user:logout', []);
    this.hooks.set('route:change', []);
    this.hooks.set('theme:change', []);
    this.hooks.set('data:update', []);
  }

  private setupSecuritySandbox(): void {
    // Create secure sandbox environment for plugins
    // This would implement CSP, iframe sandboxing, or Web Workers
  }

  async loadPlugin(pluginUrl: string): Promise<void> {
    try {
      // Fetch plugin manifest
      const manifestResponse = await fetch(`${pluginUrl}/manifest.json`);
      const manifest: PluginManifest = await manifestResponse.json();

      // Validate manifest
      this.validateManifest(manifest);

      // Check permissions
      await this.checkPermissions(manifest);

      // Check dependencies
      await this.checkDependencies(manifest);

      // Load plugin code
      const pluginCode = await this.loadPluginCode(pluginUrl, manifest.main);

      // Create plugin context
      const context = this.createPluginContext(manifest);

      // Create sandbox
      const sandbox = this.createSandbox(manifest);

      // Execute plugin in sandbox
      const pluginInstance = await this.executePlugin(pluginCode, context, sandbox);

      // Register plugin
      const plugin: Plugin = {
        manifest,
        instance: pluginInstance,
        context,
        status: 'active',
        loadTime: Date.now(),
      };

      this.plugins.set(manifest.id, plugin);
      this.sandboxes.set(manifest.id, sandbox);

      // Emit plugin loaded event
      this.emitEvent('plugin:loaded', { plugin: manifest });

      console.log(`Plugin ${manifest.name} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load plugin from ${pluginUrl}:`, error);
      throw error;
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Call plugin cleanup if available
      if (plugin.instance && typeof plugin.instance.destroy === 'function') {
        await plugin.instance.destroy();
      }

      // Remove plugin registrations
      this.cleanupPluginRegistrations(pluginId);

      // Destroy sandbox
      const sandbox = this.sandboxes.get(pluginId);
      if (sandbox && typeof sandbox.destroy === 'function') {
        sandbox.destroy();
      }

      // Remove from maps
      this.plugins.delete(pluginId);
      this.sandboxes.delete(pluginId);

      // Emit plugin unloaded event
      this.emitEvent('plugin:unloaded', { pluginId });

      console.log(`Plugin ${plugin.manifest.name} unloaded successfully`);
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  private validateManifest(manifest: PluginManifest): void {
    const required = ['id', 'name', 'version', 'description', 'author', 'main'];
    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        throw new Error(`Plugin manifest missing required field: ${field}`);
      }
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error('Plugin version must follow semantic versioning');
    }

    // Validate ID format
    if (!/^[a-z0-9-_]+$/.test(manifest.id)) {
      throw new Error('Plugin ID must contain only lowercase letters, numbers, hyphens, and underscores');
    }
  }

  private async checkPermissions(manifest: PluginManifest): Promise<void> {
    if (!manifest.permissions) return;

    const availablePermissions = [
      'storage',
      'network',
      'notifications',
      'navigation',
      'user-data',
      'system-info',
      'file-system',
      'clipboard',
    ];

    for (const permission of manifest.permissions) {
      if (!availablePermissions.includes(permission)) {
        throw new Error(`Unknown permission: ${permission}`);
      }
    }

    // In a real implementation, you might prompt the user for permission
    console.log(`Plugin ${manifest.name} requests permissions:`, manifest.permissions);
  }

  private async checkDependencies(manifest: PluginManifest): Promise<void> {
    if (!manifest.dependencies) return;

    for (const [dep, version] of Object.entries(manifest.dependencies)) {
      const installedPlugin = this.plugins.get(dep);
      if (!installedPlugin) {
        throw new Error(`Missing dependency: ${dep}`);
      }

      // Check version compatibility (simplified)
      if (!this.isVersionCompatible(installedPlugin.manifest.version, version)) {
        throw new Error(`Incompatible dependency version: ${dep}@${version}`);
      }
    }
  }

  private isVersionCompatible(installed: string, required: string): boolean {
    // Simplified version checking - in reality, you'd use semver
    return installed >= required;
  }

  private async loadPluginCode(baseUrl: string, mainFile: string): Promise<string> {
    const response = await fetch(`${baseUrl}/${mainFile}`);
    if (!response.ok) {
      throw new Error(`Failed to load plugin code: ${response.statusText}`);
    }
    return response.text();
  }

  private createPluginContext(manifest: PluginManifest): PluginContext {
    const pluginId = manifest.id;

    return {
      api: {
        registerComponent: (name: string, component: React.ComponentType) => {
          this.components.set(`${pluginId}:${name}`, component);
        },
        registerRoute: (path: string, component: React.ComponentType) => {
          this.routes.set(`${pluginId}:${path}`, component);
        },
        registerMenuItem: (item: MenuItem) => {
          this.menuItems.push({ ...item, id: `${pluginId}:${item.id}` });
        },
        registerWidget: (widget: WidgetDefinition) => {
          this.widgets.set(`${pluginId}:${widget.id}`, widget);
        },
        registerTheme: (theme: ThemeDefinition) => {
          this.themes.set(`${pluginId}:${theme.id}`, theme);
        },
        registerCommand: (command: CommandDefinition) => {
          this.commands.set(`${pluginId}:${command.id}`, command);
        },
        registerHook: (name: string, callback: Function) => {
          this.registerHook(name, callback);
        },
        unregisterHook: (name: string, callback: Function) => {
          this.unregisterHook(name, callback);
        },
        executeHook: (name: string, ...args: any[]) => {
          return this.executeHook(name, ...args);
        },
        getAppVersion: () => '1.0.0', // Get from app config
        getUser: () => ({}), // Get current user
        showNotification: (message: string, type = 'info') => {
          this.emitEvent('notification:show', { message, type });
        },
        showModal: (component: React.ComponentType, props?: any) => {
          return new Promise((resolve) => {
            this.emitEvent('modal:show', { component, props, resolve });
          });
        },
        navigate: (path: string) => {
          this.emitEvent('navigation:navigate', { path });
        },
        makeRequest: async (url: string, options?: RequestInit) => {
          // Implement secure HTTP client with plugin restrictions
          return fetch(url, {
            ...options,
            headers: {
              ...options?.headers,
              'X-Plugin-ID': pluginId,
            },
          });
        },
      },
      config: this.getPluginConfig(pluginId),
      storage: this.createPluginStorage(pluginId),
      logger: this.createPluginLogger(pluginId),
      events: this.createPluginEventEmitter(pluginId),
    };
  }

  private createSandbox(manifest: PluginManifest): any {
    // Create a secure sandbox environment
    // This could use iframe, Web Workers, or other isolation mechanisms
    return {
      id: manifest.id,
      permissions: manifest.permissions || [],
      destroy: () => {
        // Cleanup sandbox resources
      },
    };
  }

  private async executePlugin(code: string, context: PluginContext, sandbox: any): Promise<any> {
    // Create a secure execution environment
    const pluginFunction = new Function('context', 'require', code);
    
    // Mock require function for security
    const mockRequire = (module: string) => {
      const allowedModules = ['react', 'react-dom'];
      if (!allowedModules.includes(module)) {
        throw new Error(`Module ${module} is not allowed`);
      }
      // Return mock or actual module
      return {};
    };

    try {
      const result = pluginFunction(context, mockRequire);
      return result;
    } catch (error) {
      console.error(`Plugin execution error:`, error);
      throw error;
    }
  }

  private getPluginConfig(pluginId: string): Record<string, any> {
    // Load plugin configuration from storage
    const config = localStorage.getItem(`plugin-config-${pluginId}`);
    return config ? JSON.parse(config) : {};
  }

  private createPluginStorage(pluginId: string): PluginStorage {
    const prefix = `plugin-${pluginId}-`;

    return {
      get: async (key: string) => {
        const value = localStorage.getItem(prefix + key);
        return value ? JSON.parse(value) : null;
      },
      set: async (key: string, value: any) => {
        localStorage.setItem(prefix + key, JSON.stringify(value));
      },
      remove: async (key: string) => {
        localStorage.removeItem(prefix + key);
      },
      clear: async () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        keys.forEach(key => localStorage.removeItem(key));
      },
      keys: async () => {
        return Object.keys(localStorage)
          .filter(k => k.startsWith(prefix))
          .map(k => k.substring(prefix.length));
      },
    };
  }

  private createPluginLogger(pluginId: string): PluginLogger {
    const prefix = `[Plugin:${pluginId}]`;

    return {
      debug: (message: string, ...args: any[]) => {
        console.debug(prefix, message, ...args);
      },
      info: (message: string, ...args: any[]) => {
        console.info(prefix, message, ...args);
      },
      warn: (message: string, ...args: any[]) => {
        console.warn(prefix, message, ...args);
      },
      error: (message: string, ...args: any[]) => {
        console.error(prefix, message, ...args);
      },
    };
  }

  private createPluginEventEmitter(pluginId: string): PluginEventEmitter {
    const listeners = new Map<string, Function[]>();

    return {
      on: (event: string, callback: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(callback);
      },
      off: (event: string, callback: Function) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(callback);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      },
      emit: (event: string, ...args: any[]) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          eventListeners.forEach(callback => {
            try {
              callback(...args);
            } catch (error) {
              console.error(`Plugin ${pluginId} event handler error:`, error);
            }
          });
        }
      },
      once: (event: string, callback: Function) => {
        const onceCallback = (...args: any[]) => {
          callback(...args);
          this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
      },
    };
  }

  private cleanupPluginRegistrations(pluginId: string): void {
    // Remove components
    for (const [key] of this.components) {
      if (key.startsWith(`${pluginId}:`)) {
        this.components.delete(key);
      }
    }

    // Remove routes
    for (const [key] of this.routes) {
      if (key.startsWith(`${pluginId}:`)) {
        this.routes.delete(key);
      }
    }

    // Remove menu items
    this.menuItems = this.menuItems.filter(item => !item.id.startsWith(`${pluginId}:`));

    // Remove widgets
    for (const [key] of this.widgets) {
      if (key.startsWith(`${pluginId}:`)) {
        this.widgets.delete(key);
      }
    }

    // Remove themes
    for (const [key] of this.themes) {
      if (key.startsWith(`${pluginId}:`)) {
        this.themes.delete(key);
      }
    }

    // Remove commands
    for (const [key] of this.commands) {
      if (key.startsWith(`${pluginId}:`)) {
        this.commands.delete(key);
      }
    }

    // Remove hooks
    for (const [hookName, callbacks] of this.hooks) {
      this.hooks.set(hookName, callbacks.filter(cb => !cb.toString().includes(pluginId)));
    }
  }

  // Hook system
  registerHook(name: string, callback: Function): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    this.hooks.get(name)!.push(callback);
  }

  unregisterHook(name: string, callback: Function): void {
    const callbacks = this.hooks.get(name);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  async executeHook(name: string, ...args: any[]): Promise<any[]> {
    const callbacks = this.hooks.get(name) || [];
    const results = [];

    for (const callback of callbacks) {
      try {
        const result = await callback(...args);
        results.push(result);
      } catch (error) {
        console.error(`Hook ${name} execution error:`, error);
      }
    }

    return results;
  }

  // Event system
  private emitEvent(event: string, data?: any): void {
    this.eventEmitter.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  addEventListener(event: string, callback: EventListener): void {
    this.eventEmitter.addEventListener(event, callback);
  }

  removeEventListener(event: string, callback: EventListener): void {
    this.eventEmitter.removeEventListener(event, callback);
  }

  // Getters for registered items
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getComponents(): Map<string, React.ComponentType> {
    return new Map(this.components);
  }

  getRoutes(): Map<string, React.ComponentType> {
    return new Map(this.routes);
  }

  getMenuItems(): MenuItem[] {
    return [...this.menuItems];
  }

  getWidgets(): Map<string, WidgetDefinition> {
    return new Map(this.widgets);
  }

  getThemes(): Map<string, ThemeDefinition> {
    return new Map(this.themes);
  }

  getCommands(): Map<string, CommandDefinition> {
    return new Map(this.commands);
  }

  // Plugin management
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status === 'active') {
      return;
    }

    try {
      if (plugin.instance && typeof plugin.instance.enable === 'function') {
        await plugin.instance.enable();
      }
      plugin.status = 'active';
      this.emitEvent('plugin:enabled', { pluginId });
    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.status === 'inactive') {
      return;
    }

    try {
      if (plugin.instance && typeof plugin.instance.disable === 'function') {
        await plugin.instance.disable();
      }
      plugin.status = 'inactive';
      this.emitEvent('plugin:disabled', { pluginId });
    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  // Configuration management
  async updatePluginConfig(pluginId: string, config: Record<string, any>): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    localStorage.setItem(`plugin-config-${pluginId}`, JSON.stringify(config));
    
    if (plugin.context) {
      plugin.context.config = config;
    }

    if (plugin.instance && typeof plugin.instance.onConfigUpdate === 'function') {
      await plugin.instance.onConfigUpdate(config);
    }

    this.emitEvent('plugin:config-updated', { pluginId, config });
  }

  getPluginConfig(pluginId: string): Record<string, any> {
    const config = localStorage.getItem(`plugin-config-${pluginId}`);
    return config ? JSON.parse(config) : {};
  }
}

// Create singleton instance
export const pluginManager = new PluginManager();
export default PluginManager;