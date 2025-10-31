import React from 'react';
import { Provider } from 'react-redux';
import { Helmet } from 'react-helmet-async';

import { store } from './store';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { AccessibilityProvider } from './components/accessibility/AccessibilityProvider';
import { PerformanceProfiler } from './components/performance/PerformanceProfiler';
import { AuthProvider } from './components/auth/AuthProvider';
import { GlobalLoadingProvider } from './components/common/GlobalLoadingProvider';
import { AppRouter } from './routes/AppRouter';
import { ErrorBoundary } from './components/common/ErrorBoundary';



const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PerformanceProfiler id="App">
          <ThemeProvider>
            <AccessibilityProvider>
              <GlobalLoadingProvider>
                <AuthProvider>
                  <Helmet>
                    <title>ACSO - Autonomous Cyber-Security & Service Orchestrator</title>
                    <meta 
                      name="description" 
                      content="Enterprise-grade autonomous IT management and security operations platform" 
                    />
                  </Helmet>
                  
                  <AppRouter />
                </AuthProvider>
              </GlobalLoadingProvider>
            </AccessibilityProvider>
          </ThemeProvider>
        </PerformanceProfiler>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;