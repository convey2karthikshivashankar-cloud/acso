import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';
import { UserPreferences } from '../types';

interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const defaultPreferences: UserPreferences = {
  theme: 'auto',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/dd/yyyy',
  notifications: {
    email: true,
    push: true,
    inApp: true,
    channels: ['security', 'system'],
    frequency: 'immediate',
  },
  dashboard: {
    defaultView: 'overview',
    refreshInterval: 30000, // 30 seconds
    widgetSettings: {},
  },
};

export const useUserPreferences = (): UseUserPreferencesReturn => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preferences = user?.preferences || null;

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedPreferences = {
        ...user.preferences,
        ...updates,
      };

      // Update user in Redux store
      dispatch(updateUser({ preferences: updatedPreferences }));

      // In a real app, this would also sync with the backend
      // await authService.updateProfile({ preferences: updatedPreferences });

      // Store in localStorage as backup
      localStorage.setItem('acso-user-preferences', JSON.stringify(updatedPreferences));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      console.error('Failed to update preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [user, dispatch]);

  const resetPreferences = useCallback(async () => {
    await updatePreferences(defaultPreferences);
  }, [updatePreferences]);

  // Initialize preferences if user doesn't have them
  useEffect(() => {
    if (user && !user.preferences) {
      // Try to load from localStorage first
      const savedPreferences = localStorage.getItem('acso-user-preferences');
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          dispatch(updateUser({ preferences: parsed }));
        } catch {
          // If parsing fails, use defaults
          dispatch(updateUser({ preferences: defaultPreferences }));
        }
      } else {
        dispatch(updateUser({ preferences: defaultPreferences }));
      }
    }
  }, [user, dispatch]);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    loading,
    error,
  };
};