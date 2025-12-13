/**
 * Simplified API Gateway Server (No WebSocket/Terminals)
 * Use this if you're having build issues with ws or node-pty
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import MCPClientManager from './mcpClient.js';
import assistantRouter from './routes/assistant.js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '..', '.env');
console.log(`Loading .env from: ${envPath}`);

// Manually load parent .env if dotenv/config didn't find it
import * as dotenv from 'dotenv';
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 4000;

// MCP Client Manager
const mcpManager = new MCPClientManager();

// Security Middleware
const isProduction = process.env.NODE_ENV === 'production';

// Helmet for secure HTTP headers (relaxed in dev for easier debugging)
app.use(helmet({
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: isProduction,
}));

// Rate limiting - prevent abuse
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isProduction ? 60 : 1000, // 60 requests/min in prod, 1000 in dev
    message: { success: false, error: { message: 'Too many requests, please try again later.' } },
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
    origin: isProduction
        ? process.env.ALLOWED_ORIGINS?.split(',') || []
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
};
app.use(cors(corsOptions));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));

// Apply rate limiting to AI endpoints
app.use('/api/assistant', apiLimiter);

// Mount assistant routes
app.use('/api/assistant', assistantRouter);

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
