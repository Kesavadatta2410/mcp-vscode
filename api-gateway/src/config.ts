/**
 * Configuration and Feature Flags
 * Centralized configuration for the API Gateway
 */

// Feature Flags - read from environment
export const config = {
    // Server settings
    port: parseInt(process.env.PORT || '4000'),

    // Feature flags
    features: {
        terminal: process.env.ENABLE_TERMINAL === 'true',
        debug: process.env.ENABLE_DEBUG === 'true',
        codeExecution: process.env.ENABLE_CODE_EXECUTION !== 'false', // Default enabled
        portForwarding: process.env.ENABLE_PORT_FORWARDING === 'true',
        aiAssistant: process.env.ENABLE_AI_ASSISTANT !== 'false', // Default enabled
    },

    // API Keys
    geminiApiKey: process.env.GEMINI_API_KEY,

    // Paths
    projectPath: process.env.PROJECT_PATH || process.cwd(),
    allowedDirectories: (process.env.ALLOWED_DIRECTORIES || process.cwd()).split(';'),
    gitRepoPath: process.env.GIT_REPO_PATH || process.cwd(),

    // Security
    allowedCommands: (process.env.ALLOWED_VSCODE_COMMANDS || '').split(',').filter(Boolean),
    securityLogging: process.env.SECURITY_LOGGING === 'true',

    // MCP Server paths
    mcpServers: {
        repo: '../servers/repo-mcp-server/dist/index.js',
        git: '../servers/git-mcp-server/dist/index.js',
        exec: '../servers/exec-mcp-server/dist/index.js',
        vscode: '../servers/vscode-mcp-server/dist/index.js',
        github: '../servers/github-mcp-server/dist/index.js',
    },
};

// Type definitions
export interface FeatureFlags {
    terminal: boolean;
    debug: boolean;
    codeExecution: boolean;
    portForwarding: boolean;
    aiAssistant: boolean;
}

// Helper to check if a feature is enabled
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return config.features[feature];
}

// Log current configuration (sanitized)
export function logConfig(): void {
    console.log('\n=== Configuration ===');
    console.log('Port:', config.port);
    console.log('Features:');
    Object.entries(config.features).forEach(([key, value]) => {
        console.log(`  ${key}: ${value ? '✅ Enabled' : '❌ Disabled'}`);
    });
    console.log('Project Path:', config.projectPath);
    console.log('Gemini API Key:', config.geminiApiKey ? '✅ Set' : '❌ Not set');
    console.log('=====================\n');
}

export default config;
