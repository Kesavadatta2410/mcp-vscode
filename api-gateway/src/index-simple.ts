/**
 * Simplified API Gateway Server (No WebSocket/Terminals)
 * Use this if you're having build issues with ws or node-pty
 */

import express from 'express';
import cors from 'cors';
import MCPClientManager from './mcpClient.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Initialize MCP manager
const mcpManager = new MCPClientManager();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP API endpoint
app.post('/api/mcp/:server/:tool', async (req, res) => {
    const { server, tool } = req.params;
    const args = req.body;

    try {
        const client = await mcpManager.getClient(server);
        const result = await client.call(`tools/${tool}`, args);

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error(`MCP call failed: ${server}.${tool}`, error);
        res.status(500).json({
            success: false,
            error: {
                type: 'ExecutionError',
                message: error.message || 'Unknown error',
            },
        });
    }
});

// Terminal endpoints return "not available" when terminals are disabled
app.post('/api/terminals/create', (req, res) => {
    res.status(503).json({
        success: false,
        error: {
            type: 'TerminalNotAvailable',
            message: 'Terminal features are not available in this build. Install node-pty to enable terminals.',
        },
    });
});

app.get('/api/terminals/list', (req, res) => {
    res.json({
        success: true,
        data: [],
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   MCP API Gateway (Simplified)             ║
║   Port: ${PORT}                               ║
║   Terminals: DISABLED                      ║
║   Status: Ready                            ║
╚════════════════════════════════════════════╝

Note: Terminal features are disabled.
File operations, code execution, and git work fine.

Frontend: http://localhost:3000
Backend:  http://localhost:${PORT}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    mcpManager.stopAll();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    mcpManager.stopAll();
    process.exit(0);
});
