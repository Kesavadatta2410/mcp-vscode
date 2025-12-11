/**
 * API Gateway Server
 * Bridges HTTP/WebSocket requests to MCP servers
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import MCPClientManager from './mcpClient.js';
import TerminalManager from './terminalManager.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/terminals' });

const PORT = parseInt(process.env.PORT || '4000', 10);

// Initialize managers
const mcpManager = new MCPClientManager();
const terminalManager = new TerminalManager();

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

// Terminal API endpoints
app.post('/api/terminals/create', (req, res) => {
    try {
        const { name, cols, rows } = req.body;
        const terminal = terminalManager.createTerminal(name, cols, rows);

        res.json({
            success: true,
            data: {
                id: terminal.id,
                name: terminal.name,
                wsUrl: `/terminals?id=${terminal.id}`,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: {
                type: 'TerminalError',
                message: error.message,
            },
        });
    }
});

app.get('/api/terminals/list', (req, res) => {
    const terminals = terminalManager.listTerminals();
    res.json({
        success: true,
        data: terminals,
    });
});

app.post('/api/terminals/:id/resize', (req, res) => {
    const { id } = req.params;
    const { cols, rows } = req.body;

    const success = terminalManager.resize(id, cols, rows);

    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({
            success: false,
            error: {
                type: 'NotFound',
                message: 'Terminal not found',
            },
        });
    }
});

app.delete('/api/terminals/:id', (req, res) => {
    const { id } = req.params;
    const success = terminalManager.dispose(id);

    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({
            success: false,
            error: {
                type: 'NotFound',
                message: 'Terminal not found',
            },
        });
    }
});

// WebSocket handler for terminals
wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const terminalId = url.searchParams.get('id');

    if (!terminalId) {
        ws.close(1008, 'Missing terminal ID');
        return;
    }

    const terminal = terminalManager.getTerminal(terminalId);
    if (!terminal) {
        ws.close(1008, 'Terminal not found');
        return;
    }

    console.log(`WebSocket connected to terminal ${terminalId}`);

    // Send terminal output to client
    const onData = (data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    };

    terminal.pty.onData(onData);

    // Receive input from client
    ws.on('message', (data: Buffer) => {
        terminal.pty.write(data.toString());
    });

    // Handle resize messages
    ws.on('message', (message: Buffer) => {
        try {
            const msg = JSON.parse(message.toString());
            if (msg.type === 'resize' && msg.cols && msg.rows) {
                terminalManager.resize(terminalId, msg.cols, msg.rows);
            }
        } catch {
            // Ignore non-JSON messages (regular input)
        }
    });

    // Cleanup on disconnect
    ws.on('close', () => {
        console.log(`WebSocket disconnected from terminal ${terminalId}`);
        terminal.pty.removeListener('data', onData);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for terminal ${terminalId}:`, error);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   MCP API Gateway                          ║
║   Port: ${PORT}                               ║
║   WebSocket: ws://localhost:${PORT}/terminals  ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    mcpManager.stopAll();
    terminalManager.disposeAll();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    mcpManager.stopAll();
    terminalManager.disposeAll();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
