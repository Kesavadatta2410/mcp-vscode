/**
 * Terminal WebSocket Client
 * Manages WebSocket connection to backend terminals
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/terminals';

interface TerminalConnection {
    id: string;
    ws: WebSocket;
    onData: (data: string) => void;
    onClose: () => void;
}

class TerminalClient {
    private connections = new Map<string, TerminalConnection>();

    async createTerminal(name?: string, cols?: number, rows?: number): Promise<{ id: string; name: string }> {
        const response = await fetch('/api/terminals/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, cols, rows }),
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to create terminal');
        }

        return data.data;
    }

    connect(terminalId: string, onData: (data: string) => void, onClose: () => void): void {
        const ws = new WebSocket(`${WS_URL}?id=${terminalId}`);

        ws.onopen = () => {
            console.log(`Connected to terminal ${terminalId}`);
        };

        ws.onmessage = (event) => {
            onData(event.data);
        };

        ws.onclose = () => {
            console.log(`Disconnected from terminal ${terminalId}`);
            this.connections.delete(terminalId);
            onClose();
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for terminal ${terminalId}:`, error);
        };

        this.connections.set(terminalId, { id: terminalId, ws, onData, onClose });
    }

    send(terminalId: string, data: string): void {
        const connection = this.connections.get(terminalId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(data);
        }
    }

    resize(terminalId: string, cols: number, rows: number): void {
        const connection = this.connections.get(terminalId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
    }

    disconnect(terminalId: string): void {
        const connection = this.connections.get(terminalId);
        if (connection) {
            connection.ws.close();
            this.connections.delete(terminalId);
        }
    }

    async deleteTerminal(terminalId: string): Promise<void> {
        this.disconnect(terminalId);

        await fetch(`/api/terminals/${terminalId}`, {
            method: 'DELETE',
        });
    }

    disconnectAll(): void {
        for (const [id] of this.connections) {
            this.disconnect(id);
        }
    }
}

export const terminalClient = new TerminalClient();
export default terminalClient;
