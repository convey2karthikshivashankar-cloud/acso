interface IntegrationConfig {
  id: string;
  name: string;
  type: 'iframe' | 'api' | 'sso' | 'webhook' | 'widget';
  url: string;
  credentials?: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    token?: string;
  };
  settings: Record<string, any>;
  permissions: string[];
  enabled: boolean;
}

interface IframeIntegration {
  id: string;
  url: string;
  sandbox: string[];
  allowedOrigins: string[];
  messageHandlers: Map<string, Function>;
}

interface APIIntegration {
  id: string;
  baseUrl: string;
  headers: Record<string, string>;
  timeout: number;
  retryConfig: {
    attempts: number;
    delay: number;
  };
}

interface SSOIntegration {
  id: string;
  provider: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  endpoints: {
    authorization: string;
    token: string;
    userInfo: string;
  };
}

class IntegrationService {
  private integrations = new Map<string, IntegrationConfig>();
  private iframeIntegrations = new Map<string, IframeIntegration>();
  private apiIntegrations = new Map<string, APIIntegration>();
  private ssoIntegrations = new Map<string, SSOIntegration>();
  private messageHandlers = new Map<string, Function>();

  constructor() {
    this.initializeMessageHandling();
    this.loadIntegrations();
  }

  private initializeMessageHandling(): void {
    window.addEventListener('message', this.handlePostMessage.bind(this));
  }

  private async loadIntegrations(): Promise<void> {
    try {
      const stored = localStorage.getItem('integrations');
      if (stored) {
        const configs: IntegrationConfig[] = JSON.parse(stored);
        for (const config of configs) {
          await this.registerIntegration(config);
        }
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  }

  async registerIntegration(config: IntegrationConfig): Promise<void> {
    // Validate configuration
    this.validateIntegrationConfig(config);

    // Store configuration
    this.integrations.set(config.id, config);

    // Initialize based on type
    switch (config.type) {
      case 'iframe':
        await this.initializeIframeIntegration(config);
        break;
      case 'api':
        await this.initializeAPIIntegration(config);
        break;
      case 'sso':
        await this.initializeSSOIntegration(config);
        break;
      case 'webhook':
        await this.initializeWebhookIntegration(config);
        break;
      case 'widget':
        await this.initializeWidgetIntegration(config);
        break;
    }

    // Save to storage
    this.saveIntegrations();

    console.log(`Integration ${config.name} registered successfully`);
  }

  private validateIntegrationConfig(config: IntegrationConfig): void {
    if (!config.id || !config.name || !config.type || !config.url) {
      throw new Error('Integration config missing required fields');
    }

    if (this.integrations.has(config.id)) {
      throw new Error(`Integration with ID ${config.id} already exists`);
    }

    // Validate URL
    try {
      new URL(config.url);
    } catch {
      throw new Error('Invalid integration URL');
    }

    // Validate permissions
    const validPermissions = [
      'read', 'write', 'admin', 'user-data', 'system-info', 'network'
    ];
    
    for (const permission of config.permissions) {
      if (!validPermissions.includes(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }
  }

  private async initializeIframeIntegration(config: IntegrationConfig): Promise<void> {
    const iframe: IframeIntegration = {
      id: config.id,
      url: config.url,
      sandbox: config.settings.sandbox || ['allow-scripts', 'allow-same-origin'],
      allowedOrigins: config.settings.allowedOrigins || [new URL(config.url).origin],
      messageHandlers: new Map(),
    };

    this.iframeIntegrations.set(config.id, iframe);
  }

  private async initializeAPIIntegration(config: IntegrationConfig): Promise<void> {
    const api: APIIntegration = {
      id: config.id,
      baseUrl: config.url,
      headers: {
        'Content-Type': 'application/json',
        ...config.settings.headers,
      },
      timeout: config.settings.timeout || 30000,
      retryConfig: {
        attempts: config.settings.retryAttempts || 3,
        delay: config.settings.retryDelay || 1000,
      },
    };

    // Add authentication headers
    if (config.credentials?.apiKey) {
      api.headers['Authorization'] = `Bearer ${config.credentials.apiKey}`;
    }

    this.apiIntegrations.set(config.id, api);
  }

  private async initializeSSOIntegration(config: IntegrationConfig): Promise<void> {
    const sso: SSOIntegration = {
      id: config.id,
      provider: config.settings.provider,
      clientId: config.credentials?.clientId || '',
      redirectUri: config.settings.redirectUri,
      scopes: config.settings.scopes || ['openid', 'profile', 'email'],
      endpoints: {
        authorization: config.settings.authorizationEndpoint,
        token: config.settings.tokenEndpoint,
        userInfo: config.settings.userInfoEndpoint,
      },
    };

    this.ssoIntegrations.set(config.id, sso);
  }

  private async initializeWebhookIntegration(config: IntegrationConfig): Promise<void> {
    // Register webhook endpoint
    const webhookUrl = `${window.location.origin}/api/webhooks/${config.id}`;
    
    // Store webhook configuration
    const webhookConfig = {
      id: config.id,
      url: webhookUrl,
      secret: config.credentials?.token || this.generateWebhookSecret(),
      events: config.settings.events || [],
    };

    // In a real implementation, you would register this with your backend
    console.log('Webhook integration configured:', webhookConfig);
  }

  private async initializeWidgetIntegration(config: IntegrationConfig): Promise<void> {
    // Load external widget script
    const script = document.createElement('script');
    script.src = config.url;
    script.async = true;
    script.onload = () => {
      console.log(`Widget ${config.name} loaded successfully`);
    };
    script.onerror = () => {
      console.error(`Failed to load widget ${config.name}`);
    };
    
    document.head.appendChild(script);
  }

  // Iframe Integration Methods
  createIframe(integrationId: string, containerId: string): HTMLIFrameElement {
    const integration = this.iframeIntegrations.get(integrationId);
    if (!integration) {
      throw new Error(`Iframe integration ${integrationId} not found`);
    }

    const iframe = document.createElement('iframe');
    iframe.src = integration.url;
    iframe.sandbox = integration.sandbox.join(' ');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    const container = document.getElementById(containerId);
    if (container) {
      container.appendChild(iframe);
    }

    return iframe;
  }

  private handlePostMessage(event: MessageEvent): void {
    // Validate origin
    const integration = Array.from(this.iframeIntegrations.values())
      .find(int => int.allowedOrigins.includes(event.origin));

    if (!integration) {
      console.warn('Received message from unauthorized origin:', event.origin);
      return;
    }

    // Handle message
    const { type, data } = event.data;
    const handler = integration.messageHandlers.get(type);
    
    if (handler) {
      try {
        handler(data, event);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    }
  }

  registerMessageHandler(integrationId: string, messageType: string, handler: Function): void {
    const integration = this.iframeIntegrations.get(integrationId);
    if (integration) {
      integration.messageHandlers.set(messageType, handler);
    }
  }

  sendMessageToIframe(integrationId: string, message: any, targetOrigin?: string): void {
    const integration = this.iframeIntegrations.get(integrationId);
    if (!integration) {
      throw new Error(`Iframe integration ${integrationId} not found`);
    }

    const iframe = document.querySelector(`iframe[src*="${integration.id}"]`) as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      const origin = targetOrigin || integration.allowedOrigins[0];
      iframe.contentWindow.postMessage(message, origin);
    }
  }

  // API Integration Methods
  async makeAPIRequest(integrationId: string, endpoint: string, options: RequestInit = {}): Promise<Response> {
    const integration = this.apiIntegrations.get(integrationId);
    if (!integration) {
      throw new Error(`API integration ${integrationId} not found`);
    }

    const url = `${integration.baseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...integration.headers,
        ...options.headers,
      },
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), integration.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await this.retryRequest(() => fetch(url, requestOptions), integration.retryConfig);
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async retryRequest(
    requestFn: () => Promise<Response>,
    retryConfig: { attempts: number; delay: number }
  ): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.attempts; attempt++) {
      try {
        const response = await requestFn();
        if (response.ok || attempt === retryConfig.attempts) {
          return response;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        if (attempt < retryConfig.attempts) {
          await this.delay(retryConfig.delay * attempt);
        }
      }
    }

    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // SSO Integration Methods
  async initiateSSOLogin(integrationId: string): Promise<void> {
    const integration = this.ssoIntegrations.get(integrationId);
    if (!integration) {
      throw new Error(`SSO integration ${integrationId} not found`);
    }

    const state = this.generateState();
    const nonce = this.generateNonce();

    // Store state and nonce for validation
    sessionStorage.setItem(`sso_state_${integrationId}`, state);
    sessionStorage.setItem(`sso_nonce_${integrationId}`, nonce);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: integration.clientId,
      redirect_uri: integration.redirectUri,
      scope: integration.scopes.join(' '),
      state,
      nonce,
    });

    const authUrl = `${integration.endpoints.authorization}?${params.toString()}`;
    window.location.href = authUrl;
  }

  async handleSSOCallback(integrationId: string, code: string, state: string): Promise<any> {
    const integration = this.ssoIntegrations.get(integrationId);
    if (!integration) {
      throw new Error(`SSO integration ${integrationId} not found`);
    }

    // Validate state
    const storedState = sessionStorage.getItem(`sso_state_${integrationId}`);
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for token
    const tokenResponse = await fetch(integration.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: integration.clientId,
        code,
        redirect_uri: integration.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch(integration.endpoints.userInfo, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();

    // Clean up session storage
    sessionStorage.removeItem(`sso_state_${integrationId}`);
    sessionStorage.removeItem(`sso_nonce_${integrationId}`);

    return {
      tokens: tokenData,
      user: userData,
    };
  }

  // Data Export/Import Methods
  async exportData(integrationId: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<Blob> {
    const config = this.integrations.get(integrationId);
    if (!config) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    // Get data from integration
    const data = await this.getIntegrationData(integrationId);

    // Format data
    let content: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        break;
      case 'csv':
        content = this.convertToCSV(data);
        mimeType = 'text/csv';
        break;
      case 'xml':
        content = this.convertToXML(data);
        mimeType = 'application/xml';
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return new Blob([content], { type: mimeType });
  }

  async importData(integrationId: string, file: File): Promise<void> {
    const config = this.integrations.get(integrationId);
    if (!config) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    const content = await file.text();
    let data: any;

    // Parse based on file type
    if (file.type.includes('json')) {
      data = JSON.parse(content);
    } else if (file.type.includes('csv')) {
      data = this.parseCSV(content);
    } else if (file.type.includes('xml')) {
      data = this.parseXML(content);
    } else {
      throw new Error('Unsupported file format');
    }

    // Send data to integration
    await this.sendDataToIntegration(integrationId, data);
  }

  // Helper Methods
  private async getIntegrationData(integrationId: string): Promise<any> {
    // Implementation depends on integration type
    const config = this.integrations.get(integrationId);
    if (!config) return null;

    switch (config.type) {
      case 'api':
        return this.makeAPIRequest(integrationId, '/data');
      default:
        return {};
    }
  }

  private async sendDataToIntegration(integrationId: string, data: any): Promise<void> {
    const config = this.integrations.get(integrationId);
    if (!config) return;

    switch (config.type) {
      case 'api':
        await this.makeAPIRequest(integrationId, '/data', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        break;
    }
  }

  private convertToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ];

    return csvRows.join('\n');
  }

  private convertToXML(data: any): string {
    // Simple XML conversion - in reality, you'd use a proper XML library
    const xmlString = JSON.stringify(data);
    return `<?xml version="1.0" encoding="UTF-8"?><root>${xmlString}</root>`;
  }

  private parseCSV(content: string): any[] {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });
      return obj;
    });
  }

  private parseXML(content: string): any {
    // Simple XML parsing - in reality, you'd use DOMParser or a proper XML library
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    return this.xmlToJson(doc.documentElement);
  }

  private xmlToJson(xml: Element): any {
    const obj: any = {};
    
    if (xml.hasAttributes()) {
      obj['@attributes'] = {};
      for (const attr of xml.attributes) {
        obj['@attributes'][attr.name] = attr.value;
      }
    }
    
    if (xml.hasChildNodes()) {
      for (const child of xml.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (text) {
            obj['#text'] = text;
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childElement = child as Element;
          const childObj = this.xmlToJson(childElement);
          
          if (obj[childElement.nodeName]) {
            if (!Array.isArray(obj[childElement.nodeName])) {
              obj[childElement.nodeName] = [obj[childElement.nodeName]];
            }
            obj[childElement.nodeName].push(childObj);
          } else {
            obj[childElement.nodeName] = childObj;
          }
        }
      }
    }
    
    return obj;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateWebhookSecret(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private saveIntegrations(): void {
    const configs = Array.from(this.integrations.values());
    localStorage.setItem('integrations', JSON.stringify(configs));
  }

  // Public API
  getIntegrations(): IntegrationConfig[] {
    return Array.from(this.integrations.values());
  }

  getIntegration(id: string): IntegrationConfig | undefined {
    return this.integrations.get(id);
  }

  async removeIntegration(id: string): Promise<void> {
    this.integrations.delete(id);
    this.iframeIntegrations.delete(id);
    this.apiIntegrations.delete(id);
    this.ssoIntegrations.delete(id);
    this.saveIntegrations();
  }

  async updateIntegration(id: string, updates: Partial<IntegrationConfig>): Promise<void> {
    const existing = this.integrations.get(id);
    if (!existing) {
      throw new Error(`Integration ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    await this.registerIntegration(updated);
  }
}

export const integrationService = new IntegrationService();
export default IntegrationService;