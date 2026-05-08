/**
 * Script to export Firebase Firestore data to JSON
 * RUN ON YOUR LOCAL MACHINE:
 * 1. npm install firebase-admin
 * 2. Put your serviceAccountKey.json in the same folder
 * 3. node export-firebase.js
 */
const admin = require("firebase-admin");
const fs = require('fs');

// Path to your service account key file
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportData() {
    const data = {};
    const collections = ['users', 'books', 'issues', 'shop_books', 'finances', 'blogs'];

    console.log("Starting export...");

    for (const collName of collections) {
        console.log(`Exporting ${collName}...`);
        const snapshot = await db.collection(collName).get();
        data[collName] = [];
        snapshot.forEach(doc => {
            let docData = doc.data();
            docData.id = doc.id; // Save original ID
            data[collName].push(docData);
        });
        console.log(`Success: Exported ${data[collName].length} items from ${collName}`);
    }

    // Save to JSON
    fs.writeFileSync('firebase_data_export.json', JSON.stringify(data, null, 2));
    console.log("Successfully exported all data to firebase_data_export.json");
}

exportData().catch(console.error);
