/**
 * Terminal Manager - Manages node-pty terminal instances
 */

import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Try to import node-pty, but allow failure on systems without build tools
let pty: any = null;

// Dynamically import at runtime if available
(async () => {
    try {
        pty = await import('node-pty');
    } catch (error) {
        console.warn('node-pty not available. Terminal features will be disabled.');
        console.warn('To enable terminals, install build tools and run: npm install node-pty');
    }
})();

export interface Terminal {
    id: string;
    name: string;
    pty: pty.IPty;
    createdAt: Date;
    lastActivity: Date;
}

export class TerminalManager {
    private terminals = new Map<string, Terminal>();
    private readonly maxTerminals = 10;
    private readonly inactivityTimeout = 30 * 60 * 1000; // 30 minutes

    constructor() {
        // Cleanup inactive terminals every 5 minutes
        setInterval(() => this.cleanupInactive(), 5 * 60 * 1000);
    }

    createTerminal(name?: string, cols?: number, rows?: number): Terminal {
        if (this.terminals.size >= this.maxTerminals) {
            throw new Error('Maximum number of terminals reached');
        }

        const id = uuidv4();
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: cols || 80,
            rows: rows || 24,
            cwd: process.env.PROJECT_PATH || process.cwd(),
            env: process.env as { [key: string]: string },
        });

        const terminal: Terminal = {
            id,
            name: name || `Terminal ${this.terminals.size + 1}`,
            pty: ptyProcess,
            createdAt: new Date(),
            lastActivity: new Date(),
        };

        this.terminals.set(id, terminal);

        console.log(`Created terminal ${id} (${terminal.name})`);

        return terminal;
    }

    getTerminal(id: string): Terminal | undefined {
        const terminal = this.terminals.get(id);
        if (terminal) {
            terminal.lastActivity = new Date();
        }
        return terminal;
    }

    listTerminals(): Array<{ id: string; name: string; createdAt: Date }> {
        return Array.from(this.terminals.values()).map(t => ({
            id: t.id,
            name: t.name,
            createdAt: t.createdAt,
        }));
    }

    write(id: string, data: string): boolean {
        const terminal = this.getTerminal(id);
        if (!terminal) {
            return false;
        }

        terminal.pty.write(data);
        return true;
    }

    resize(id: string, cols: number, rows: number): boolean {
        const terminal = this.getTerminal(id);
        if (!terminal) {
            return false;
        }

        terminal.pty.resize(cols, rows);
        return true;
    }

    dispose(id: string): boolean {
        const terminal = this.terminals.get(id);
        if (!terminal) {
            return false;
        }

        terminal.pty.kill();
        this.terminals.delete(id);

        console.log(`Disposed terminal ${id} (${terminal.name})`);

        return true;
    }

    private cleanupInactive(): void {
        const now = Date.now();

        for (const [id, terminal] of this.terminals.entries()) {
            const inactive = now - terminal.lastActivity.getTime();
            if (inactive > this.inactivityTimeout) {
                console.log(`Cleaning up inactive terminal ${id} (inactive for ${Math.floor(inactive / 60000)}min)`);
                this.dispose(id);
            }
        }
    }

    disposeAll(): void {
        for (const id of this.terminals.keys()) {
            this.dispose(id);
        }
    }
}

export default TerminalManager;
