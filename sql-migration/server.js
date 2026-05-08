/**
 * Complete Node.js + Express + MySQL Backend for Library Management System
 * Save this file as `server.js` and run `npm install express cors mysql2 dotenv bcryptjs jsonwebtoken`
 */

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Database connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'library_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// === MIDDLEWARE ===
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// === AUTHENTICATION API ===
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = users[0];
        // Note: For migrated Firebase users, you must reset passwords OR use Firebase Admin SDK to verify
        // assuming standard bcrypt here.
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === BOOKS API ===

// Get all books
app.get('/api/books', async (req, res) => {
    try {
        const [books] = await db.query('SELECT * FROM books ORDER BY added_at DESC');
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a book (admin only)
app.post('/api/books', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { id, title, author, description, category, cover_url } = req.body;
    try {
        await db.query(`INSERT INTO books (id, title, author, description, category, cover_url) VALUES (?, ?, ?, ?, ?, ?)`, 
        [id, title, author, description, category, cover_url]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update standard book fields
app.put('/api/books/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { title, author, description, category, status } = req.body;
    try {
        await db.query(`UPDATE books SET title=?, author=?, description=?, category=?, status=? WHERE id=?`, 
        [title, author, description, category, status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a book
app.delete('/api/books/:id', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
        await db.query('DELETE FROM books WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === START SERVER ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`SQL Backend running on port ${PORT}`);
});
