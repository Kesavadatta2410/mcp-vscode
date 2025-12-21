/**
 * Authentication Router
 * Handles user signup, login, and session management
 */

import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const router = express.Router();

// Database setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', '..', 'data', 'auth.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        gemini_api_key TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// Simple hash function (in production, use bcrypt)
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Middleware to verify auth token
export function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) as any;

    if (!session) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.userId = session.user_id;
    next();
}

// Signup endpoint
router.post('/signup', async (req, res) => {
    try {
        const { email, password, apiKey } = req.body;

        if (!email || !password || !apiKey) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and API key are required'
            });
        }

        // Check if user already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }

        // Create user
        const passwordHash = hashPassword(password);
        const result = db.prepare(
            'INSERT INTO users (email, password_hash, gemini_api_key) VALUES (?, ?, ?)'
        ).run(email, passwordHash, apiKey);

        const userId = result.lastInsertRowid;

        // Create session
        const token = generateToken();
        db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(userId, token);

        res.json({
            success: true,
            data: {
                token,
                user: { id: userId, email },
                hasApiKey: true
            }
        });
    } catch (error: any) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Signup failed'
        });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Find user
        const passwordHash = hashPassword(password);
        const user = db.prepare(
            'SELECT id, email, gemini_api_key FROM users WHERE email = ? AND password_hash = ?'
        ).get(email, passwordHash) as any;

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Create session
        const token = generateToken();
        db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(user.id, token);

        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, email: user.email },
                hasApiKey: !!user.gemini_api_key
            }
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Login failed'
        });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req: any, res) => {
    try {
        const user = db.prepare(
            'SELECT id, email, gemini_api_key FROM users WHERE id = ?'
        ).get(req.userId) as any;

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: { id: user.id, email: user.email },
                hasApiKey: !!user.gemini_api_key
            }
        });
    } catch (error: any) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get user'
        });
    }
});

// Update API key
router.post('/update-api-key', authenticateToken, async (req: any, res) => {
    try {
        const { apiKey } = req.body;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API key is required'
            });
        }

        db.prepare('UPDATE users SET gemini_api_key = ? WHERE id = ?').run(apiKey, req.userId);

        res.json({ success: true });
    } catch (error: any) {
        console.error('Update API key error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update API key'
        });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req: any, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Logout failed'
        });
    }
});

export default router;
