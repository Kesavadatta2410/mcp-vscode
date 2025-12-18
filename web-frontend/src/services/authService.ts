/**
 * Auth Service
 * Handles user authentication with backend database
 * Stores session token locally, API key is stored server-side
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'mcp_auth_token';
const USER_KEY = 'mcp_user_data';

interface UserData {
    id: number;
    email: string;
}

interface AuthResponse {
    success: boolean;
    data?: {
        token: string;
        user: UserData;
        hasApiKey: boolean;
    };
    error?: string;
}

export const authService = {
    /**
     * Get stored session token
     */
    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * Get stored user data
     */
    getUser(): UserData | null {
        try {
            const data = localStorage.getItem(USER_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Check if user is authenticated (has valid token)
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    },

    /**
     * Signup with email, password, and API key
     */
    async signup(email: string, password: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, apiKey })
            });

            const data: AuthResponse = await response.json();

            if (data.success && data.data) {
                localStorage.setItem(TOKEN_KEY, data.data.token);
                localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
                return { success: true };
            }

            return { success: false, error: data.error || 'Signup failed' };
        } catch (e: any) {
            return { success: false, error: e.message || 'Network error' };
        }
    },

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<{ success: boolean; error?: string; hasApiKey?: boolean }> {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data: AuthResponse = await response.json();

            if (data.success && data.data) {
                localStorage.setItem(TOKEN_KEY, data.data.token);
                localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
                return { success: true, hasApiKey: data.data.hasApiKey };
            }

            return { success: false, error: data.error || 'Login failed' };
        } catch (e: any) {
            return { success: false, error: e.message || 'Network error' };
        }
    },

    /**
     * Update API key for current user
     */
    async updateApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
        try {
            const token = this.getToken();
            if (!token) {
                return { success: false, error: 'Not authenticated' };
            }

            const response = await fetch(`${API_URL}/api/auth/update-api-key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ apiKey })
            });

            const data = await response.json();
            return { success: data.success, error: data.error };
        } catch (e: any) {
            return { success: false, error: e.message || 'Network error' };
        }
    },

    /**
     * Validate current session
     */
    async validateSession(): Promise<{ valid: boolean; user?: UserData; hasApiKey?: boolean }> {
        try {
            const token = this.getToken();
            if (!token) {
                return { valid: false };
            }

            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success && data.data) {
                localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
                return { valid: true, user: data.data.user, hasApiKey: data.data.hasApiKey };
            }

            // Token invalid - clear local storage
            this.logout();
            return { valid: false };
        } catch (e) {
            return { valid: false };
        }
    },

    /**
     * Logout - clear local storage and notify backend
     */
    async logout(): Promise<void> {
        try {
            const token = this.getToken();
            if (token) {
                await fetch(`${API_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (e) {
            // Ignore errors during logout
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    },

    /**
     * Validate API key by making a test request (called during signup)
     */
    async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Say "API key valid" in exactly 3 words.' }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    })
                }
            );

            if (response.ok) {
                return { valid: true };
            } else {
                const error = await response.json();
                return { valid: false, error: error.error?.message || 'Invalid API key' };
            }
        } catch (e: any) {
            return { valid: false, error: e.message || 'Network error' };
        }
    }
};

export default authService;
