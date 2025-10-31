import { demoDataIntegrationService } from '../../services/demoDataIntegrationService';
import {
  mockDemoDataOrchestrator,
  mockBackgroundDataService,
  mockScenarioTriggerService,
  mockRealTimeDataService,
  mockMetricsAggregationService,
  mockWebSocketService,
  waitForNextTick,
  waitForCondition,
} from '../utils/testHelpers';

// Mock all dependencies
jest.mock('../../services/demoDataOrchestrator', () => ({
  demoDataOrchestrator: mockDemoDataOrchestrator,
}));

jest.mock('../../services/backgroundDataService', () => ({
  backgroundDataService: mockBackgroundDataService,
}));

jest.mock('../../services/scenarioTriggerService', () => ({
  scenarioTriggerService: mockScenarioTriggerService,
}));

jest.mock('../../services/realTimeDataService', () => ({
  realTimeDataService: mockRealTimeDataService,
}));

jest.mock('../../services/metricsAggregationService', () => ({
  metricsAggregationService: mockMetricsAggregationService,
}));

jest.mock('../../services/websocketService', () => ({
  websocketService: mockWebSocketService,
}));

describe('Demo Data Integration Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    demoDataIntegrationService.destroy();
  });

  afterEach(() => {
    demoDataIntegrationService.destroy();
  });

  describe('Service Initialization', () => {
    it('should initialize all core services in correct order', async () => {
      await demoDataIntegrationService.initialize();
      
      // Check that all services were initialized
      expect(mockRealTimeDataService.initialize).toHaveBeenCalled();
      expect(mockDemoDataOrchestrator.initialize).toHaveBeenCalled();
      expect(mockBackgroundDataService.initialize).toHaveBeenCalled();
      expect(mockScenarioTriggerService.initialize).toHaveBeenCalled();
      
      // Check initialization order (real-time service should be first)
      const initCalls = [
        mockRealTimeDataService.initialize.mock.invocationCallOrder[0],
        mockDemoDataOrchestrator.initialize.mock.invocationCallOrder[0],
        mockBackgroundDataService.initialize.mock.invocationCallOrder[0],
        mockScenarioTriggerService.initialize.mock.invocationCallOrder[0],
      ];
      
      expect(initCalls[0]).toBeLessThan(initCalls[1]);
      expect(initCalls[1]).toBeLessThan(initCalls[2]);
    });

    it('should handle initialization failures gracefully', async () => {
      mockRealTimeDataService.initialize.mockRejectedValueOnce(new Error('Init failed'));
      
      await expect(demoDataIntegrationService.initialize()).rejects.toThrow('Init failed');
      
      const state = demoDataIntegrationService.getState();
      expect(state.isInitialized).toBe(false);
    });

    it('should not initialize twice', async () => {
      await demoDataIntegrationService.initialize();
      await demoDataIntegrationService.initialize();
      
      // Each service should only be initialized once
      expect(mockRealTimeDataService.initialize).toHaveBeenCalledTimes(1);
      expect(mockDemoDataOrchestrator.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Demo Management', () => {
    beforeEach(async () => {
      await demoDataIntegrationService.initialize();
    });

    it('should start demo scenarios', async () => {
      mockDemoDataOrchestrator.startSession.mockReturnValue('test_session');
      
      const sessionId = await demoDataIntegrationService.startDemo('test-scenario');
      
      expect(sessionId).toBe('test_session');
      expect(mockDemoDataOrchestrator.startSession).toHaveBeenCalledWith(
        'test-scenario',
        expect.objectContaining({
          playbackSpeed: expect.any(Number),
          enableNotifications: true,
          showEventMarkers: expect.any(Boolean),
        })
      );
    });

    it('should start demo with default scenario when none specified', async () => {
      mockDemoDataOrchestrator.getScenarios.mockReturnValue([
        { id: 'default-scenario', name: 'Default' },
      ]);
      mockDemoDataOrchestrator.startSession.mockReturnValue('default_session');
      
      const sessionId = await demoDataIntegrationService.startDemo();
      
      expect(sessionId).toBe('default_session');
      expect(mockDemoDataOrchestrator.startSession).toHaveBeenCalledWith(
        'default-scenario',
        expect.any(Object)
      );
    });

    it('should handle no available scenarios', async () => {
      mockDemoDataOrchestrator.getScenarios.mockReturnValue([]);
      
      await expect(demoDataIntegrationService.startDemo()).rejects.toThrow('No scenarios available');
    });

    it('should stop demo sessions', () => {
      mockDemoDataOrchestrator.stopSession.mockReturnValue(true);
      
      const result = demoDataIntegrationService.stopDemo('test_session');
      
      expect(result).toBe(true);
      expect(mockDemoDataOrchestrator.stopSession).toHaveBeenCalledWith('test_session');
    });

    it('should stop all sessions when no session ID provided', () => {
      const mockSessions = [
        { id: 'session1', status: 'running' },
        { id: 'session2', status: 'running' },
      ];
      mockDemoDataOrchestrator.getCurrentSessions.mockReturnValue(mockSessions);
      mockDemoDataOrchestrator.stopSession.mockReturnValue(true);
      
      const result = demoDataIntegrationService.stopDemo();
      
      expect(result).toBe(true);
      expect(mockDemoDataOrchestrator.stopSession).toHaveBeenCalledTimes(2);
    });

    it('should pause and resume demo sessions', () => {
      mockDemoDataOrchestrator.pauseSession.mockReturnValue(true);
      mockDemoDataOrchestrator.resumeSession.mockReturnValue(true);
      
      const pauseResult = demoDataIntegrationService.pauseDemo('test_session');
      const resumeResult = demoDataIntegrationService.resumeDemo('test_session');
      
      expect(pauseResult).toBe(true);
      expect(resumeResult).toBe(true);
      expect(mockDemoDataOrchestrator.pauseSession).toHaveBeenCalledWith('test_session');
      expect(mockDemoDataOrchestrator.resumeSession).toHaveBeenCalledWith('test_session');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await demoDataIntegrationService.initialize();
    });

    it('should handle demo orchestrator errors gracefully', async () => {
      mockDemoDataOrchestrator.startSession.mockImplementation(() => {
        throw new Error('Demo service error');
      });
      
      await expect(demoDataIntegrationService.startDemo('test-scenario')).rejects.toThrow('Demo service error');
    });

    it('should handle service dependency failures', () => {
      mockBackgroundDataService.getStatus.mockImplementation(() => {
        throw new Error('Background service error');
      });
      
      // Should not crash the integration service
      expect(() => {
        demoDataIntegrationService.getState();
      }).not.toThrow();
    });
  });

  describe('State Management', () => {
    it('should return correct state when not initialized', () => {
      const state = demoDataIntegrationService.getState();
      
      expect(state.isInitialized).toBe(false);
      expect(state.activeSessions).toHaveLength(0);
    });

    it('should return correct state when initialized', async () => {
      await demoDataIntegrationService.initialize();
      
      const state = demoDataIntegrationService.getState();
      
      expect(state.isInitialized).toBe(true);
    });

    it('should track active demo sessions', async () => {
      await demoDataIntegrationService.initialize();
      
      mockDemoDataOrchestrator.getCurrentSessions.mockReturnValue([
        { id: 'session1', status: 'running' },
        { id: 'session2', status: 'paused' },
      ]);
      
      const state = demoDataIntegrationService.getState();
      expect(state.activeSessions).toHaveLength(2);
    });
  });

  describe('Service Lifecycle', () => {
    it('should destroy all services correctly', async () => {
      await demoDataIntegrationService.initialize();
      
      demoDataIntegrationService.destroy();
      
      expect(mockRealTimeDataService.cleanup).toHaveBeenCalled();
      expect(mockDemoDataOrchestrator.destroy).toHaveBeenCalled();
      expect(mockBackgroundDataService.destroy).toHaveBeenCalled();
      expect(mockScenarioTriggerService.destroy).toHaveBeenCalled();
      
      const state = demoDataIntegrationService.getState();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should initialize within reasonable time', async () => {
      const start = performance.now();
      await demoDataIntegrationService.initialize();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(2000); // Should initialize within 2 seconds
    });

    it('should handle concurrent operations efficiently', async () => {
      await demoDataIntegrationService.initialize();
      
      const operations = [
        demoDataIntegrationService.startDemo('scenario1'),
        demoDataIntegrationService.startDemo('scenario2'),
        demoDataIntegrationService.startDemo('scenario3'),
      ];
      
      const results = await Promise.allSettled(operations);
      
      // At least some operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });
});