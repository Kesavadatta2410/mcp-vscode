/**
 * Auth Context Provider
 * Manages authentication state with database-backed auth
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import authService from '../services/authService';

interface User {
    id: number;
    email: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    hasApiKey: boolean;
    loading: boolean;
    signup: (email: string, password: string, apiKey: string) => Promise<{ success: boolean; error?: string }>;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsApiKey?: boolean }>;
    updateApiKey: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [loading, setLoading] = useState(true);

    // Check existing auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            const hasToken = authService.isAuthenticated();
            console.log('[AuthContext] Checking auth, hasToken:', hasToken);

            if (hasToken) {
                try {
                    const result = await authService.validateSession();
                    console.log('[AuthContext] Session validation result:', result);
                    if (result.valid) {
                        setIsAuthenticated(true);
                        setUser(result.user || null);
                        setHasApiKey(result.hasApiKey || false);
                    } else {
                        // Invalid session - clear it and show login
                        console.log('[AuthContext] Session invalid, clearing auth');
                        authService.logout();
                        setIsAuthenticated(false);
                        setUser(null);
                        setHasApiKey(false);
                    }
                } catch (error) {
                    // Validation failed (network error, server restart, etc.)
                    console.error('[AuthContext] Session validation error:', error);
                    // Clear potentially stale session
                    authService.logout();
                    setIsAuthenticated(false);
                    setUser(null);
                    setHasApiKey(false);
                }
            } else {
                // No token - ensure we show login
                setIsAuthenticated(false);
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const signup = useCallback(async (email: string, password: string, apiKey: string): Promise<{ success: boolean; error?: string }> => {
        // Don't set loading here - AuthPage handles its own loading state

        // Validate API key first
        const validation = await authService.validateApiKey(apiKey);
        if (!validation.valid) {
            return { success: false, error: validation.error || 'Invalid API key' };
        }

        // Create account
        const result = await authService.signup(email, password, apiKey);

        if (result.success) {
            setIsAuthenticated(true);
            setUser(authService.getUser());
            setHasApiKey(true);
        }

        return result;
    }, []);

    const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; needsApiKey?: boolean }> => {
        // Don't set loading here - it causes race condition with redirect
        const result = await authService.login(email, password);

        if (result.success) {
            setIsAuthenticated(true);
            setUser(authService.getUser());
            setHasApiKey(result.hasApiKey || false);
        }

        return { ...result, needsApiKey: result.success && !result.hasApiKey };
    }, []);

    const updateApiKey = useCallback(async (apiKey: string): Promise<{ success: boolean; error?: string }> => {
        // Validate first
        const validation = await authService.validateApiKey(apiKey);
        if (!validation.valid) {
            return { success: false, error: validation.error || 'Invalid API key' };
        }

        const result = await authService.updateApiKey(apiKey);
        if (result.success) {
            setHasApiKey(true);
        }
        return result;
    }, []);

    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
        setHasApiKey(false);
        setIsAuthenticated(false);
    }, []);

    const getToken = useCallback(() => {
        return authService.getToken();
    }, []);

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            hasApiKey,
            loading,
            signup,
            login,
            updateApiKey,
            logout,
            getToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
