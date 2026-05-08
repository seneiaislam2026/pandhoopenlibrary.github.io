/**
 * Script to import exported Firebase JSON into MySQL
 * npm install mysql2 bcryptjs
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'library_db',
});

async function importData() {
    const rawData = fs.readFileSync('firebase_data_export.json');
    const data = JSON.parse(rawData);

    // 1. Import Users
    if (data.users) {
        console.log(`Importing ${data.users.length} users...`);
        for (const user of data.users) {
            const role = user.role || 'reader';
            // Firebase passwords are not easily exportable.
            // Setup a default password for migration: "123456"
            // Let users know they must change it, OR maintain Firebase Auth.
            const defaultPassword = await bcrypt.hash('123456', 10);
            
            try {
                await db.query(`INSERT IGNORE INTO users (id, username, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)`,
                [user.id, user.username || user.email, user.email || null, defaultPassword, user.name || 'User', role]);
            } catch (err) {
                console.error("User import error:", err.message);
            }
        }
    }

    // 2. Import Books
    if (data.books) {
        console.log(`Importing ${data.books.length} books...`);
        for (const book of data.books) {
            try {
                await db.query(`INSERT IGNORE INTO books (id, title, author, description, category, cover_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [book.id, book.title, book.author || 'Unknown', book.description || '', book.category || 'General', book.cover || null, book.status || 'Available']);
            } catch (err) {
                console.error("Book import error:", err.message);
            }
        }
    }

    // 3. Import Issues
    if (data.issues) {
        console.log(`Importing ${data.issues.length} issues...`);
        for (const issue of data.issues) {
            try {
                // Formatting firebase timestamps to MySQL datetime
                const issueDate = new Date(issue.issueDate?._seconds * 1000 || Date.now());
                
                await db.query(`INSERT IGNORE INTO issues (id, book_id, user_id, issue_date, status) VALUES (?, ?, ?, ?, ?)`,
                [issue.id, issue.bookId, issue.userId, issueDate, issue.status || 'active']);
            } catch (err) {
                console.error("Issue import error:", err.message);
            }
        }
    }

    console.log("Migration complete!");
    process.exit(0);
}

importData().catch(console.error);
