import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'pandhoa-open-library-secret-2026';
const DB_FILE = path.resolve(process.cwd(), 'database.json');

app.use(express.json());

// === IN-MEMORY / JSON DATABASE ===
// We use a JSON file mapping NoSQL-like collections to run reliably in this environment

const defaultData = {
  users: [],
  books: [],
  issues: [],
  donations: [],
  finances: [],
  team: [],
  posts: [],
  payments: [],
  preBookings: [],
  notices: [],
  messages: [],
  bookRequests: [],
  resetRequests: [],
  dues: []
};

async function readDb() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(data);
    // Ensure all collections exist
    return { ...defaultData, ...db };
  } catch (error) {
    return defaultData;
  }
}

async function writeDb(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Ensure Admin and Sample Data exists
async function initDb() {
  const db = await readDb();
  let updated = false;

  const adminExists = db.users.find((u: any) => u.username === 'Library2026');
  if (!adminExists) {
    const hashedFn = await bcrypt.hash('Library@@2026', 10);
    db.users.push({
      id: 'admin-1',
      name: 'Super Admin',
      username: 'Library2026',
      password: hashedFn,
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString()
    });
    updated = true;
    console.log("Admin account created.");
  }

  const testUserExists = db.users.find((u: any) => u.username === 'TestUser');
  if (!testUserExists) {
    const hashedPw = await bcrypt.hash('test123456', 10);
    db.users.push({
      id: 'test-user-1',
      name: 'Test Member',
      username: 'TestUser',
      password: hashedPw,
      role: 'reader',
      status: 'active',
      memberId: '1002',
      createdAt: new Date().toISOString()
    });
    updated = true;
    console.log("Test member account created (Username: TestUser, PW: test123456).");
  }

  if (db.books.length === 0) {
    db.books.push(
      { id: 'b1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Classic', status: 'Available', bookCode: 'LIB-001', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600' },
      { id: 'b2', title: '1984', author: 'George Orwell', category: 'Dystopian', status: 'Issued', bookCode: 'LIB-002', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600' },
      { id: 'b3', title: 'Sapiens', author: 'Yuval Noah Harari', category: 'History', status: 'Available', bookCode: 'LIB-003', cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600' }
    );
    updated = true;
  }

  if (db.team.length < 2) {
    const defaultTeam = [
      { id: 't1', name: 'Al Mahmud', role: 'Chief Librarian', contact: '01570206953', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400' },
      { id: 't2', name: 'Fatema Tuz Zohra', role: 'Operations Head', contact: '01570206953', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400' }
    ];
    // Add missing members
    defaultTeam.forEach(m => {
       if (!db.team.find((existing: any) => existing.id === m.id)) {
          db.team.push(m);
       }
    });
    updated = true;
  }

  if (db.donations.length === 0) {
    db.donations.push(
      { id: 'd1', name: 'Anonymous', amount: 5000, date: new Date().toISOString(), status: 'Completed' },
      { id: 'd2', name: 'Rahim Uddin', amount: 2500, date: new Date().toISOString(), status: 'Completed' }
    );
    db.finances.push(
      { id: 'f1', type: 'income', amount: 5000, description: 'Donation from Anonymous', date: new Date().toISOString() },
      { id: 'f2', type: 'income', amount: 2500, description: 'Donation from Rahim Uddin', date: new Date().toISOString() }
    );
    updated = true;
  }
  
  if (db.posts.length === 0) {
     db.posts.push({ id: 'p1', title: 'Welcome to Pandhoa Open Library', content: 'We are thrilled to announce the opening of our new web platform. Our goal is to bring a world of knowledge to our community, completely open and accessible to all.', date: new Date().toISOString()});
     updated = true;
  }

  if (updated) {
    await writeDb(db);
  }
}

initDb();

// === MIDDLEWARE ===
const authMiddleware = (roles: string[] = []) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// === API ROUTES ===

// -- Auth --
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`[LOGIN ATTEMPT] Username: ${username}`);
  
  const db = await readDb();
  const user = db.users.find((u: any) => u.username?.toLowerCase() === username?.toLowerCase());
  
  if (!user) {
    console.log(`[LOGIN FAILED] User not found: ${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    console.log(`[LOGIN FAILED] Invalid password for: ${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    console.log(`[LOGIN FAILED] Account pending: ${username}`);
    return res.status(403).json({ error: 'Account is pending approval' });
  }

  console.log(`[LOGIN SUCCESS] User: ${username}, Role: ${user.role}`);
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name, username: user.username, memberId: user.memberId }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, username: user.username, memberId: user.memberId, phone: user.phone || '', address: user.address || '' } });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { username, phone } = req.body;
  const db = await readDb();
  if (!db.resetRequests) db.resetRequests = [];
  
  const user = db.users.find((u: any) => u.username === username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const request = {
    id: Date.now().toString(),
    userId: user.id,
    userName: user.name,
    username: user.username,
    phone: phone || user.phone,
    status: 'Pending',
    date: new Date().toISOString()
  };
  
  db.resetRequests.push(request);
  await writeDb(db);
  res.json({ message: 'Reset request sent to administrator' });
});

app.get('/api/reset-requests', authMiddleware(['admin']), async (req, res) => {
    const db = await readDb();
    res.json(db.resetRequests || []);
});

app.delete('/api/reset-requests/:id', authMiddleware(['admin']), async (req, res) => {
    const db = await readDb();
    db.resetRequests = (db.resetRequests || []).filter((r: any) => String(r.id) !== String(req.params.id));
    await writeDb(db);
    res.json({ success: true });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, username, password, phone, address } = req.body;
  const db = await readDb();
  
  if (db.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    name,
    phone,
    address,
    username,
    password: hashedPassword,
    role: 'reader',
    status: 'pending', // Requires admin approval
    createdAt: new Date().toISOString()
  };
  
  db.users.push(newUser);
  await writeDb(db);
  await addNotification(
    'New Member Registration',
    `${name} (${username}) has requested to join.`,
    'registration'
  );
  res.status(201).json({ message: 'Registration successful. Account is pending admin approval' });
});

app.get('/api/notifications', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  res.json(db.notifications || []);
});

app.patch('/api/notifications/:id/read', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.notifications) db.notifications = [];
  const idx = db.notifications.findIndex((n: any) => String(n.id) === String(req.params.id));
  if (idx !== -1) {
    db.notifications[idx].read = true;
    await writeDb(db);
  }
  res.json({ success: true });
});

async function addNotification(title: string, message: string, type: string) {
  const db = await readDb();
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  });
  // Keep only last 50
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
  await writeDb(db);
}

// -- Users --
app.get('/api/my-profile', authMiddleware(['admin', 'reader']), async (req, res) => {
  const db = await readDb();
  if (!db.users) db.users = [];
  const user = db.users.find((u: any) => String(u.id) === String((req as any).user.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.patch('/api/my-profile', authMiddleware(['admin', 'reader']), async (req, res) => {
  const db = await readDb();
  if (!db.users) db.users = [];
  const userIndex = db.users.findIndex((u: any) => String(u.id) === String((req as any).user.id));
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  if (req.body.avatar !== undefined) {
    db.users[userIndex].avatar = req.body.avatar;
  }
  
  await writeDb(db);
  const { password, ...safeUser } = db.users[userIndex];
  res.json(safeUser);
});

// -- Users (Admin only) --
app.get('/api/users', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.users) db.users = [];
  const safeUsers = db.users.map(({ password, ...u }: any) => u);
  res.json(safeUsers);
});

app.post('/api/users', authMiddleware(['admin']), async (req, res) => {
  const { name, username, password, role, status, phone } = req.body;
  const db = await readDb();
  if (!db.users) db.users = [];
  
  if (db.users.find((u: any) => u.username === username)) {
    return res.status(400).json({ error: 'Username already taken' });
  }
  
  const hashedPassword = await bcrypt.hash(password || '123456', 10);

  // Auto-generate 4-digit Member ID if status is active
  let memberId = '';
  if (status === 'active') {
    const activeMembers = db.users.filter((u: any) => u.memberId);
    const lastId = activeMembers.length > 0 
      ? Math.max(...activeMembers.map((u: any) => parseInt(u.memberId) || 0)) 
      : 1000;
    memberId = String(lastId + 1).padStart(4, '0');
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    username,
    password: hashedPassword,
    role: role || 'reader',
    status: status || 'active',
    isMonthlyDonor: req.body.isMonthlyDonor || false,
    phone: phone || '',
    memberId,
    createdAt: new Date().toISOString()
  };
  
  db.users.push(newUser);
  await writeDb(db);
  const { password: pw, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.patch('/api/users/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.users) db.users = [];
  const userIndex = db.users.findIndex(u => String(u.id) === String(req.params.id));
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  const oldStatus = db.users[userIndex].status;
  const newStatus = req.body.status;

  // Generate member ID if moving to active status and doesn't have one
  if (newStatus === 'active' && oldStatus !== 'active' && !db.users[userIndex].memberId) {
    const activeMembers = db.users.filter((u: any) => u.memberId);
    const lastId = activeMembers.length > 0 
      ? Math.max(...activeMembers.map((u: any) => parseInt(u.memberId) || 0)) 
      : 1000;
    req.body.memberId = String(lastId + 1).padStart(4, '0');
  }

  // Handle password change - only if a non-empty string is provided
  if (req.body.password && req.body.password.trim() !== "") {
    req.body.password = await bcrypt.hash(req.body.password, 10);
  } else {
    delete req.body.password;
  }

  db.users[userIndex] = { ...db.users[userIndex], ...req.body };
  await writeDb(db);
  const { password, ...safeUser } = db.users[userIndex];
  res.json(safeUser);
});

app.delete('/api/users/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.users) db.users = [];
  const userId = String(req.params.id);
  
  if (userId === 'admin-1') {
    return res.status(403).json({ error: 'Cannot delete the super admin account' });
  }

  const userIndex = db.users.findIndex((u: any) => String(u.id) === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User record not found' });
  }

  // Remove related data
  if (db.issues) db.issues = db.issues.filter((i: any) => String(i.userId) !== userId);
  if (db.payments) db.payments = db.payments.filter((p: any) => String(p.userId) !== userId);
  if (db.preBookings) db.preBookings = db.preBookings.filter((p: any) => String(p.userId) !== userId);
  if (db.messages) db.messages = db.messages.filter((m: any) => String(m.toUserId) !== userId && String(m.fromUserId) !== userId);
  if (db.purchases) db.purchases = db.purchases.filter((p: any) => String(p.userId) !== userId);

  db.users.splice(userIndex, 1);
  await writeDb(db);
  res.json({ success: true });
});

// -- Donor Members --
app.get('/api/donor-members', async (req, res) => {
  const db = await readDb();
  res.json(db.donorMembers || []);
});

app.post('/api/donor-members', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.donorMembers) db.donorMembers = [];
  const maxSerial = db.donorMembers.reduce((max: number, d: any) => Math.max(max, d.serial || 0), 0);
  const member = { id: Date.now().toString(), serial: maxSerial + 1, ...req.body, createdAt: new Date().toISOString() };
  db.donorMembers.push(member);
  await writeDb(db);
  res.status(201).json(member);
});

app.put('/api/donor-members/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.donorMembers) db.donorMembers = [];
  const idx = db.donorMembers.findIndex((m: any) => String(m.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Donor member not found' });
  db.donorMembers[idx] = { ...db.donorMembers[idx], ...req.body };
  await writeDb(db);
  res.json(db.donorMembers[idx]);
});

app.delete('/api/donor-members/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.donorMembers) db.donorMembers = [];
  db.donorMembers = db.donorMembers.filter((m: any) => String(m.id) !== String(req.params.id));
  await writeDb(db);
  res.json({ success: true });
});

// -- Donor Payments --
app.get('/api/donor-payments', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  res.json(db.donorPayments || []);
});

app.post('/api/donor-payments', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.donorPayments) db.donorPayments = [];
  const payment = { id: Date.now().toString(), ...req.body, status: req.body.status || 'Paid', date: new Date().toISOString() };
  db.donorPayments.push(payment);
  await writeDb(db);
  res.status(201).json(payment);
});

app.patch('/api/donor-payments/:id/status', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.donorPayments) db.donorPayments = [];
  const idx = db.donorPayments.findIndex((p: any) => String(p.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Payment not found' });
  db.donorPayments[idx].status = req.body.status;
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/donor-payments/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.donorPayments) db.donorPayments = [];
  db.donorPayments = db.donorPayments.filter((p: any) => String(p.id) !== String(req.params.id));
  await writeDb(db);
  res.json({ success: true });
});

// -- Messaging System --
app.get('/api/messages', authMiddleware(['admin', 'reader']), async (req, res) => {
  const db = await readDb();
  const user = (req as any).user;
  
  if (user.role === 'admin') {
    res.json(db.messages || []);
  } else {
    // Readers only see messages sent TO them or BY them
    const myMessages = (db.messages || []).filter((m: any) => 
      String(m.toUserId) === String(user.id) || String(m.fromUserId) === String(user.id)
    );
    res.json(myMessages);
  }
});

app.post('/api/messages', authMiddleware(['admin', 'reader']), async (req, res) => {
  const db = await readDb();
  const fromUser = (req as any).user;
  const { toUserId, content, subject } = req.body;

  if (!db.messages) db.messages = [];
  
  const message = {
    id: Date.now().toString(),
    fromUserId: fromUser.id,
    fromUserName: fromUser.name,
    toUserId,
    toUserName: toUserId === 'all' ? 'All Members' : (db.users.find((u: any) => String(u.id) === String(toUserId))?.name || 'Unknown'),
    subject: subject || 'Notice/Support',
    content,
    date: new Date().toISOString(),
    isRead: false
  };

  db.messages.push(message);
  await writeDb(db);
  res.status(201).json(message);
});

app.patch('/api/messages/:id/read', authMiddleware(['admin', 'reader']), async (req, res) => {
  const db = await readDb();
  const msgIndex = (db.messages || []).findIndex((m: any) => String(m.id) === String(req.params.id));
  if (msgIndex !== -1) {
    db.messages[msgIndex].isRead = true;
    await writeDb(db);
  }
  res.json({ success: true });
});

app.delete('/api/messages/:id/delete', authMiddleware(['admin']), async (req, res) => {
    const db = await readDb();
    db.messages = (db.messages || []).filter((m: any) => String(m.id) !== String(req.params.id));
    await writeDb(db);
    res.json({ success: true });
});

// -- Books --
app.get('/api/books', async (req, res) => {
  const db = await readDb();
  res.json(db.books);
});

app.post('/api/books', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.books) db.books = [];
  
  if (req.body.bookCode) {
    const existing = db.books.find((b: any) => b.bookCode?.toLowerCase() === req.body.bookCode.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'A book with this code already exists.' });
    }
  }

  const newBook = { id: Date.now().toString(), ...req.body, status: req.body.status || 'Available', createdAt: new Date().toISOString() };
  db.books.push(newBook);
  await writeDb(db);
  res.status(201).json(newBook);
});

app.post('/api/books/:id/buy', authMiddleware(['reader', 'donor', 'admin']), async (req, res) => {
  const db = await readDb();
  const book = db.books.find((b: any) => String(b.id) === String(req.params.id));
  if (!book) return res.status(404).json({ error: 'Book not found' });
  
  if (!db.purchases) db.purchases = [];
  const purchase = {
    id: Date.now().toString(),
    userId: (req as any).user.id,
    userName: (req as any).user.name,
    bookId: book.id,
    bookTitle: book.title,
    price: book.price || 200,
    date: new Date().toISOString()
  };
  
  db.purchases.push(purchase);
  await writeDb(db);
  res.status(201).json(purchase);
});

app.get('/api/purchases', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  res.json(db.purchases || []);
});

app.delete('/api/purchases/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (db.purchases) {
    db.purchases = db.purchases.filter((p: any) => String(p.id) !== String(req.params.id));
    await writeDb(db);
  }
  res.json({ success: true });
});

app.get('/api/my-purchases', authMiddleware(['reader', 'donor', 'admin']), async (req, res) => {
  const db = await readDb();
  res.json((db.purchases || []).filter((p: any) => p.userId === (req as any).user.id));
});

app.put('/api/books/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.books) db.books = [];
  const idx = db.books.findIndex((b: any) => String(b.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Book not found' });
  
  if (req.body.bookCode) {
    const existing = db.books.find((b: any) => String(b.id) !== String(req.params.id) && b.bookCode?.toLowerCase() === req.body.bookCode.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Another book with this code already exists.' });
    }
  }

  db.books[idx] = { ...db.books[idx], ...req.body };
  await writeDb(db);
  res.json(db.books[idx]);
});

app.delete('/api/books/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.books) db.books = [];
  db.books = db.books.filter((b: any) => String(b.id) !== String(req.params.id));
  await writeDb(db);
  res.json({ success: true });
});

// -- Issues --
app.get('/api/issues', authMiddleware(['admin', 'reader']), async (req, res) => {
  const db = await readDb();
  if ((req as any).user.role === 'reader') {
    res.json(db.issues.filter((i: any) => i.userId === (req as any).user.id));
  } else {
    res.json(db.issues);
  }
});

app.post('/api/issues', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.issues) db.issues = [];
  if (!db.books) db.books = [];
  const { bookId, userId, issueDate, expectedReturnDate } = req.body;
  
  const bookIndex = db.books.findIndex((b: any) => String(b.id) === String(bookId));
  if (bookIndex === -1) return res.status(404).json({ error: 'Book not found' });
  
  db.books[bookIndex].status = 'Issued';
  
  const issue = { id: Date.now().toString(), bookId, userId, issueDate, expectedReturnDate, status: 'Issued', returnDate: null };
  db.issues.push(issue);
  await writeDb(db);
  res.json(issue);
});

app.patch('/api/issues/:id/return', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.issues) db.issues = [];
  if (!db.books) db.books = [];
  console.log(`Return request for issue ID:`, req.params.id);
  const issue = db.issues.find((i: any) => String(i.id) === String(req.params.id));
  if (!issue) {
    console.log(`Issue not found among keys:`, db.issues.map((i:any) => i.id));
    return res.status(404).json({ error: 'Issue not found' });
  }
  
  issue.status = 'Returned';
  issue.returnDate = new Date().toISOString();
  
  const book = db.books.find((b: any) => String(b.id) === String(issue.bookId));
  if (book) book.status = 'Available';
  
  await writeDb(db);
  console.log(`Issue ${issue.id} marked as returned successfully.`);
  res.json(issue);
});

app.patch('/api/issues/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.issues) db.issues = [];
  const idx = db.issues.findIndex((i: any) => String(i.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Issue record not found' });
  
  db.issues[idx] = { ...db.issues[idx], ...req.body };
  await writeDb(db);
  res.json(db.issues[idx]);
});

app.delete('/api/issues/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.issues) db.issues = [];
  const issue = db.issues.find((i: any) => String(i.id) === String(req.params.id));
  if (issue && issue.status === 'Issued') {
      const book = db.books.find((b: any) => String(b.id) === String(issue.bookId));
      if (book) book.status = 'Available';
  }
  db.issues = db.issues.filter((i: any) => String(i.id) !== String(req.params.id));
  await writeDb(db);
  res.json({ success: true });
});

/**
 * Line 289-302 removed as it was redundant with /api/pre-book
 */

// -- Donations --
app.get('/api/donations', async (req, res) => {
  const db = await readDb();
  res.json(db.donations);
});

app.post('/api/donations', async (req, res) => {
  // Public route
  const db = await readDb();
  const donation = { id: Date.now().toString(), ...req.body, status: 'Completed', date: new Date().toISOString() };
  db.donations.push(donation);
  
  db.finances.push({
    id: Date.now().toString(),
    type: 'income',
    amount: req.body.amount,
    description: `Donation from ${req.body.name}`,
    date: new Date().toISOString()
  });

  await writeDb(db);
  res.status(201).json(donation);
});

// -- Finances (Admin only) --
app.get('/api/finances', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  res.json(db.finances || []);
});

app.post('/api/finances', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.finances) db.finances = [];
  const finance = { id: Date.now().toString(), ...req.body, date: new Date().toISOString() };
  db.finances.push(finance);
  await writeDb(db);
  res.status(201).json(finance);
});

app.put('/api/finances/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.finances) db.finances = [];
  const idx = db.finances.findIndex((f: any) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Entry not found' });
  db.finances[idx] = { ...db.finances[idx], ...req.body };
  await writeDb(db);
  res.json(db.finances[idx]);
});

app.delete('/api/finances/reset', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (db.finances) {
    db.finances = [];
    await writeDb(db);
  }
  res.json({ success: true });
});

app.delete('/api/finances/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.finances) db.finances = [];
  db.finances = db.finances.filter((f: any) => String(f.id) !== String(req.params.id));
  await writeDb(db);
  res.json({ success: true });
});

// -- Team --
app.get('/api/team', async (req, res) => {
  const db = await readDb();
  res.json(db.team || []);
});

app.post('/api/team', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.team) db.team = [];
  const member = { id: Date.now().toString(), ...req.body };
  db.team.push(member);
  await writeDb(db);
  res.status(201).json(member);
});

app.put('/api/team/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.team) db.team = [];
  const idx = db.team.findIndex((t: any) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Member not found' });
  db.team[idx] = { ...db.team[idx], ...req.body };
  await writeDb(db);
  res.json(db.team[idx]);
});

app.delete('/api/team/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.team) db.team = [];
  db.team = db.team.filter((t: any) => String(t.id) !== String(req.params.id));
  await writeDb(db);
  res.json({ success: true });
});

// -- Blog --
app.get('/api/posts', async (req, res) => {
  const db = await readDb();
  res.json(db.posts);
});

app.post('/api/posts', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  const post = { id: Date.now().toString(), ...req.body, date: new Date().toISOString() };
  if (!db.posts) db.posts = [];
  db.posts.push(post);
  await writeDb(db);
  res.status(201).json(post);
});

app.put('/api/posts/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  const idx = db.posts.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Post not found' });
  db.posts[idx] = { ...db.posts[idx], ...req.body };
  await writeDb(db);
  res.json(db.posts[idx]);
});

app.delete('/api/posts/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (db.posts) {
    db.posts = db.posts.filter((p: any) => String(p.id) !== String(req.params.id));
    await writeDb(db);
  }
  res.json({ success: true });
});

// -- Payments & Dues --
app.get('/api/payments', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  res.json(db.payments || []);
});

app.post('/api/payments', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.payments) db.payments = [];
  
  const payment = { id: Date.now().toString(), ...req.body, date: new Date().toISOString() };
  db.payments.push(payment);
  
  if (!db.finances) db.finances = [];
  db.finances.push({
    id: Date.now().toString() + '_f',
    type: 'income',
    amount: payment.amount,
    description: `Member/Donor Payment from user ${payment.userId} for ${payment.month || 'Custom Dues'}`,
    date: new Date().toISOString()
  });

  await writeDb(db);
  res.status(201).json(payment);
});

app.put('/api/payments/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.payments) db.payments = [];
  const idx = db.payments.findIndex((p: any) => String(p.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Payment not found' });
  db.payments[idx] = { ...db.payments[idx], ...req.body };
  await writeDb(db);
  res.json(db.payments[idx]);
});

app.delete('/api/payments/reset', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.payments) db.payments = [];
  const idsToReset = req.body.ids;
  if (idsToReset && idsToReset.length > 0) {
    db.payments = db.payments.filter((p: any) => !idsToReset.includes(p.id));
  } else {
    db.payments = [];
  }
  await writeDb(db);
  res.json({ success: true });
});

// -- bKash Integration Simulation --
app.post('/api/bkash/create', authMiddleware(['reader', 'donor', 'admin']), async (req, res) => {
  const { amount, month } = req.body;
  if (!amount) return res.status(400).json({ error: 'Amount required' });
  
  // Create a pending payment
  const db = await readDb();
  if (!db.payments) db.payments = [];
  
  const user = (req as any).user;
  const paymentId = Date.now().toString();
  const payment = {
    id: paymentId,
    userId: user.id,
    month: month || new Date().toISOString().slice(0,7),
    amount: amount,
    status: 'Pending',
    trxId: `BK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    date: new Date().toISOString()
  };
  db.payments.push(payment);
  await writeDb(db);

  // In a real scenario, call bKash API here to get paymentID and bkashURL
  const paymentID = payment.trxId; 
  const bkashURL = `/bkash-mock-payment?paymentID=${paymentID}`; // simulated URL

  res.json({ paymentID, bkashURL });
});

app.post('/api/bkash/execute', authMiddleware(['reader', 'donor', 'admin']), async (req, res) => {
  const { paymentID } = req.body;
  
  const db = await readDb();
  if (!db.payments) db.payments = [];
  
  const idx = db.payments.findIndex((p: any) => String(p.trxId) === String(paymentID));
  if (idx === -1) return res.status(404).json({ error: 'Payment not found' });

  // In a real scenario, call bKash execute API here using paymentID
  db.payments[idx].status = 'Paid';
  db.payments[idx].date = new Date().toISOString();
  
  if (!db.finances) db.finances = [];
  db.finances.push({
    id: Date.now().toString() + '_f',
    type: 'income',
    amount: db.payments[idx].amount,
    description: `bKash Payment from user ${db.payments[idx].userId}`,
    date: new Date().toISOString()
  });

  await writeDb(db);
  res.json({ success: true, payment: db.payments[idx] });
});

app.delete('/api/payments/:id', authMiddleware(['admin']), async (req, res) => {
    const db = await readDb();
    db.payments = (db.payments || []).filter((p: any) => String(p.id) !== String(req.params.id));
    await writeDb(db);
    res.json({ success: true });
});

app.patch('/api/payments/:id/approve', authMiddleware(['admin']), async (req, res) => {
    const db = await readDb();
    const idx = (db.payments || []).findIndex((p: any) => String(p.id) === String(req.params.id));
    if (idx !== -1) {
        db.payments[idx].status = 'Approved';
        
        // Also add to finances when approved
        if (!db.finances) db.finances = [];
        db.finances.push({
            id: Date.now().toString() + '_auto',
            type: 'income',
            amount: db.payments[idx].amount,
            description: `Auto-verified Payment: ${db.payments[idx].userName} for ${db.payments[idx].month}`,
            date: new Date().toISOString()
        });
        
        await writeDb(db);
    }
    res.json({ success: true });
});

app.get('/api/my-payments', authMiddleware(['reader', 'donor', 'admin']), async (req, res) => {
  const db = await readDb();
  const userPayments = (db.payments || []).filter((p: any) => p.userId === (req as any).user.id);
  res.json(userPayments);
});

app.get('/api/my-dues', authMiddleware(['reader', 'donor', 'admin']), async (req, res) => {
  const db = await readDb();
  const userDues = (db.dues || []).filter((d: any) => d.userId === (req as any).user.id);
  res.json(userDues);
});

// -- Pre-bookings --
app.get('/api/pre-bookings', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  res.json(db.preBookings || []);
});

app.post('/api/pre-book', authMiddleware(['reader', 'donor', 'admin']), async (req, res) => {
  const db = await readDb();
  if (!db.preBookings) db.preBookings = [];
  
  const existing = db.preBookings.find((p: any) => p.userId === (req as any).user.id && p.bookId === req.body.bookId && p.status === 'Pending');
  if (existing) return res.status(400).json({ error: 'Already pre-booked' });

  const preBooking = {
    id: Date.now().toString(),
    userId: (req as any).user.id,
    userName: (req as any).user.name,
    bookId: req.body.bookId,
    status: 'Pending',
    date: new Date().toISOString()
  };
  db.preBookings.push(preBooking);
  await writeDb(db);
  await addNotification(
    'New Pre-booking',
    `${preBooking.userName} requested to pre-book a manual.`,
    'prebooking'
  );
  res.status(201).json(preBooking);
});

app.get('/api/my-pre-bookings', authMiddleware(['reader', 'donor', 'admin']), async (req, res) => {
  const db = await readDb();
  const my = (db.preBookings || []).filter((p: any) => p.userId === (req as any).user.id);
  res.json(my);
});

app.patch('/api/pre-bookings/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.preBookings) db.preBookings = [];
  const idx = db.preBookings.findIndex((p: any) => String(p.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Pre-booking not found' });
  
  // Allow updating status, adminNote, and collectDate
  db.preBookings[idx] = { 
    ...db.preBookings[idx], 
    status: req.body.status || db.preBookings[idx].status,
    adminNote: req.body.adminNote !== undefined ? req.body.adminNote : db.preBookings[idx].adminNote,
    collectDate: req.body.collectDate !== undefined ? req.body.collectDate : db.preBookings[idx].collectDate
  };
  
  await writeDb(db);
  res.json(db.preBookings[idx]);
});

app.delete('/api/pre-bookings/:id', authMiddleware(['admin']), async (req, res) => {
    const db = await readDb();
    if (!db.preBookings) db.preBookings = [];
    db.preBookings = db.preBookings.filter((p: any) => String(p.id) !== String(req.params.id));
    await writeDb(db);
    res.json({ success: true });
});
// -- Book Requests --
app.get('/api/book-requests', authMiddleware(['admin', 'reader']), async (req, res) => {
  const db = await readDb();
  if (!db.bookRequests) db.bookRequests = [];
  if ((req as any).user.role === 'admin') {
    res.json(db.bookRequests);
  } else {
    res.json(db.bookRequests.filter((br: any) => String(br.userId) === String((req as any).user.id)));
  }
});

app.post('/api/book-requests', authMiddleware(['reader', 'admin']), async (req, res) => {
  const db = await readDb();
  if (!db.bookRequests) db.bookRequests = [];
  const request = {
    id: Date.now().toString(),
    userId: (req as any).user.id,
    userName: (req as any).user.name,
    bookTitle: req.body.bookTitle,
    authorName: req.body.authorName,
    status: 'Pending',
    date: new Date().toISOString()
  };
  db.bookRequests.push(request);
  await writeDb(db);
  res.status(201).json(request);
});

app.delete('/api/book-requests/:id', authMiddleware(['admin', 'reader']), async (req, res) => {
    const db = await readDb();
    db.bookRequests = (db.bookRequests || []).filter((br: any) => String(br.id) !== String(req.params.id));
    await writeDb(db);
    res.json({ success: true });
});

// -- Notices --
app.get('/api/notices', async (req, res) => {
  const db = await readDb();
  res.json(db.notices || []);
});

app.post('/api/notices', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.notices) db.notices = [];
  const notice = {
    id: Date.now().toString(),
    title: req.body.title,
    content: req.body.content,
    priority: req.body.priority || 'medium', // low, medium, high
    date: new Date().toISOString()
  };
  db.notices.unshift(notice); // Latest first
  await writeDb(db);
  res.status(201).json(notice);
});

app.delete('/api/notices/:id', authMiddleware(['admin']), async (req, res) => {
  const db = await readDb();
  if (!db.notices) db.notices = [];
  db.notices = db.notices.filter((n: any) => String(n.id) !== String(req.params.id));
  await writeDb(db);
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
