/**
 * Auth Page Component
 * Signup/Login page with email, password, and Gemini API key
 */

import React, { useState } from 'react';
import { VscKey, VscLoading, VscCheck, VscError, VscAccount, VscLock } from 'react-icons/vsc';
import { FaRobot, FaCode, FaTerminal, FaGithub } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'login' | 'signup';

const AuthPage: React.FC = () => {
    const { signup, login } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !password.trim()) {
            setError('Please enter email and password');
            return;
        }

        if (mode === 'signup' && !apiKey.trim()) {
            setError('Please enter your Gemini API key');
            return;
        }

        setLoading(true);

        try {
            if (mode === 'signup') {
                const result = await signup(email.trim(), password.trim(), apiKey.trim());
                if (!result.success) {
                    setError(result.error || 'Signup failed');
                }
                // On success, isAuthenticated becomes true and App.tsx will redirect
            } else {
                const result = await login(email.trim(), password.trim());
                if (!result.success) {
                    setError(result.error || 'Login failed');
                }
                // On success, isAuthenticated becomes true and App.tsx will redirect
                // needsApiKey scenario handled gracefully - user can still access app
            }
        } catch (e: any) {
            setError(e.message || 'An error occurred');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-500"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo and Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl mb-4 transform hover:scale-105 transition-transform">
                        <FaCode size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">MCP VS Code</h1>
                    <p className="text-gray-400">AI-Powered Code Editor</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
                    {/* Mode Tabs */}
                    <div className="flex mb-6 bg-white/5 rounded-lg p-1">
                        <button
                            onClick={() => { setMode('login'); setError(null); }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'login'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setMode('signup'); setError(null); }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'signup'
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <VscAccount className="inline mr-2" />
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                placeholder="Enter your email..."
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                disabled={loading}
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <VscLock className="inline mr-2" />
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                placeholder="Enter your password..."
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                disabled={loading}
                            />
                        </div>

                        {/* API Key Input - Only for signup */}
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    <VscKey className="inline mr-2" />
                                    Gemini API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                                        placeholder="Enter your API key..."
                                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showKey ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Get your API key from{' '}
                                    <a
                                        href="https://aistudio.google.com/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-400 hover:text-purple-300 underline"
                                    >
                                        Google AI Studio
                                    </a>
                                </p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-300 text-sm">
                                <VscError size={18} />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !email.trim() || !password.trim() || (mode === 'signup' && !apiKey.trim())}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <VscLoading className="animate-spin" size={20} />
                                    {mode === 'signup' ? 'Creating Account...' : 'Logging in...'}
                                </>
                            ) : (
                                <>
                                    <VscCheck size={20} />
                                    {mode === 'signup' ? 'Create Account' : 'Login'}
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Features */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
                        <FaRobot className="mx-auto text-purple-400 mb-2" size={24} />
                        <p className="text-xs text-gray-400">AI Assistant</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
                        <FaTerminal className="mx-auto text-blue-400 mb-2" size={24} />
                        <p className="text-xs text-gray-400">Real Terminal</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur rounded-lg p-4 border border-white/10">
                        <FaGithub className="mx-auto text-green-400 mb-2" size={24} />
                        <p className="text-xs text-gray-400">Git Integration</p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-xs mt-6">
                    Your API key is stored securely in the database and used for all AI features.
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
