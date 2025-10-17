import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { checkAuthStatus } from '../../store/slices/authSlice';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check if user is already authenticated (e.g., from localStorage)
    const token = localStorage.getItem('acso-auth-token');
    if (token && !isAuthenticated) {
      dispatch(checkAuthStatus());
    }
  }, [dispatch, isAuthenticated]);

  return <>{children}</>;
};