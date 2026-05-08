# Firebase to SQL Database Migration Guide

This guide provides the complete backend code, schema, and steps required to migrate your Library Management System from Firebase Firestore to a Node.js + MySQL backend without changing the frontend design.

## Why are you seeing Quota Limit Exceeded?
You hit `Quota exceeded for quota metric 'Free daily read units per project'`. 
Firebase Spark (Free) plan limits you to ~50,000 document reads per day. In a react app using `onSnapshot` inside `useEffect`, every user connection fetches all data, easily exhausting the limit. Migrating to your own SQL server or increasing your Firebase plan will fix this.

## Migration Steps

Follow these steps carefully to prevent data loss.

### 1. Export Data from Firebase
First, you need to extract your live data from Firestore and Auth to a JSON format.
1. Create a Firebase Service Account key from Firebase Console -> Project Settings -> Service Accounts -> Generate New Private Key. Save it as `serviceAccountKey.json` inside the `sql-migration` folder.
2. Ensure you have Node installed locally on your computer.
3. Open a terminal on your computer in the `sql-migration` folder and run:
   ```bash
   npm init -y
   npm install firebase-admin
   node export-firebase.js
   ```
   This will generate `firebase_data_export.json` with all your users, books, issues, etc.

### 2. Set Up Your MySQL Database
1. Create a MySQL Database on your hosting provider (like cPanel, Hostinger, AWS, etc.).
2. Import the `schema.sql` to create all required tables.
   ```bash
   mysql -u your_username -p your_database_name < schema.sql
   ```

### 3. Run the SQL Import Script
1. Once tables are created, you need to convert your JSON data into SQL.
2. In the `sql-migration` folder, install MySQL drivers:
   ```bash
   npm install mysql2
   ```
3. Update `import-to-mysql.js` with your MySQL connection details.
4. Run the script:
   ```bash
   node import-to-mysql.js
   ```
   *Your previous data is now safely inside MySQL.*

### 4. Deploy the Node.js Backend
1. We have provided `server.js` and `routes.js` for your new backend.
2. Install dependencies for the backend:
   ```bash
   npm install express cors mysql2 dotenv bcryptjs jsonwebtoken
   ```
3. Create a `.env` file for the backend server:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=yourpassword
   DB_NAME=library_db
   JWT_SECRET=super_secret_key_change_this
   PORT=5000
   ```
4. Run the server using pm2 or nodemon: `node server.js`.

### 5. Update Your Frontend Frontend
Right now, your frontend (`src/`) uses Firebase SDK (`getDocs`, `onSnapshot`, `addDoc`). You must replace those calls with simple `fetch()` or `axios`.
Example:
**Old (Firebase):**
```ts
const q = query(collection(db, "books"));
const snapshot = await getDocs(q);
const books = snapshot.docs.map(doc => doc.data());
```
**New (SQL API):**
```ts
const res = await fetch("http://your-apiUrl.com/api/books");
const books = await res.json();
```
*Note: Due to the size of the application, replacing all Firebase logic in one automated sweep might cause UI breakages. You can use exactly the same components and just change how data is loaded!*
