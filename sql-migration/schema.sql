-- SQL Schema for Library Management System
-- Database Setup
CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY, -- Using Firebase UID for backwards compatibility
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role ENUM('admin', 'reader') DEFAULT 'reader',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books Table
CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(255) PRIMARY KEY, -- Firestore Doc ID
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    cover_url TEXT,
    status ENUM('Available', 'Issued', 'Lost') DEFAULT 'Available',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issues Table
CREATE TABLE IF NOT EXISTS issues (
    id VARCHAR(255) PRIMARY KEY, -- Firestore Doc ID
    book_id VARCHAR(255),
    user_id VARCHAR(255),
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    return_date TIMESTAMP NULL,
    status ENUM('active', 'returned', 'overdue') DEFAULT 'active',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Shop Books (If you sell books)
CREATE TABLE IF NOT EXISTS shop_books (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    cover_url TEXT
);

-- Donations & Finances
CREATE TABLE IF NOT EXISTS finances (
    id VARCHAR(255) PRIMARY KEY,
    type ENUM('income', 'expense', 'donation'),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blogs / Notices
CREATE TABLE IF NOT EXISTS notices (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);
