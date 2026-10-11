const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_KEY = process.env.ADMIN_KEY;
const PORT = process.env.PORT || 3000;

if (!JWT_SECRET) {
    console.error("შეავსეთ JWT_SECRET .env ფაილში (იხილეთ .env.example)");
    process.exit(1);
}

// 1) პროდუქტები და ფასები სერვერზე ინახება. კლიენტის გამოგზავნილ ფასს არასდროს ვენდობით!
const PRODUCTS = {};
for (let i = 1; i <= 6; i++) PRODUCTS[`bouquet-${i}`] = { name: `თაიგული ${i}`, price: 35 };

// 2) მონაცემთა ბაზა (ერთი ფაილი: shop.db)
const db = new Database(path.join(__dirname, "shop.db"));
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        items TEXT NOT NULL,
        total REAL NOT NULL,
        delivery TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT DEFAULT (datetime('now'))
    );
`);

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public"))); // აქ ჩადეთ თქვენი საიტის ფაილები

// --- დამხმარე ფუნქციები ---

const str = (v, max) => String(v ?? "").trim().slice(0, max);

function setSession(res, user) {
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
        httpOnly: true, // JavaScript-ს ქუქის წაკითხვა არ შეუძლია (XSS-ისგან დაცვა)
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 3600 * 1000
    });
}

function requireAuth(req, res, next) {
    try {
        const { id } = jwt.verify(req.cookies.token, JWT_SECRET);
        const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(id);
        if (!user) throw new Error("no user");
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: "გთხოვთ, შეხვიდეთ სისტემაში" });
    }
}

const formatOrder = o => ({
    id: o.id, total: o.total, status: o.status, createdAt: o.created_at,
    items: JSON.parse(o.items), delivery: JSON.parse(o.delivery)
});

// --- ავტორიზაცია ---

app.post("/api/register", async (req, res) => {
    const name = str(req.body.name, 100);
    const email = str(req.body.email, 200).toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6 || password.length > 200) {
        return res.status(400).json({ error: "შეამოწმეთ შეყვანილი მონაცემები (პაროლი მინიმუმ 6 სიმბოლო)" });
    }
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
        return res.status(409).json({ error: "ამ ელფოსტით მომხმარებელი უკვე არსებობს" });
    }

    const hash = await bcrypt.hash(password, 10); // bcrypt: ნელი, salt-ით — სწორედ ამისთვისაა შექმნილი
    const info = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, hash);
    const user = { id: info.lastInsertRowid, name, email };
    setSession(res, user);
    res.status(201).json({ user });
});

app.post("/api/login", async (req, res) => {
    const email = str(req.body.email, 200).toLowerCase();
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    const ok = row && await bcrypt.compare(String(req.body.password || ""), row.password_hash);

    // ერთი და იგივე შეტყობინება ორივე შემთხვევაში — არ ვუმხელთ, რომელი ელფოსტაა რეგისტრირებული
    if (!ok) return res.status(401).json({ error: "ელფოსტა ან პაროლი არასწორია" });

    setSession(res, row);
    res.json({ user: { id: row.id, name: row.name, email: row.email } });
});

app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));

// --- შეკვეთები ---

app.post("/api/orders", requireAuth, (req, res) => {
    const { items, delivery } = req.body;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ error: "კალათა ცარიელია" });
    }

    const lines = [];
    for (const it of items) {
        const product = PRODUCTS[it.id];
        const qty = Number(it.qty);
        if (!product || !Number.isInteger(qty) || qty < 1 || qty > 99) {
            return res.status(400).json({ error: "არასწორი პროდუქტი ან რაოდენობა" });
        }
        lines.push({ id: it.id, name: product.name, price: product.price, qty });
    }

    const d = delivery || {};
    const clean = {
        name: str(d.name, 100), phone: str(d.phone, 30), address: str(d.address, 200),
        date: str(d.date, 10), time: str(d.time, 5), card: str(d.card, 300), note: str(d.note, 300)
    };
    if (!clean.name || !clean.address || !clean.date || clean.phone.replace(/\D/g, "").length < 9) {
        return res.status(400).json({ error: "შეავსეთ სახელი, ტელეფონი, მისამართი და თარიღი" });
    }

    const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0); // ჯამს სერვერი თვლის
    const id = "ORD-" + Date.now().toString(36).toUpperCase();
    db.prepare("INSERT INTO orders (id, user_id, items, total, delivery) VALUES (?, ?, ?, ?, ?)")
        .run(id, req.user.id, JSON.stringify(lines), total, JSON.stringify(clean));

    res.status(201).json({ order: { id, total, status: "new", items: lines, delivery: clean } });
});

app.get("/api/orders", requireAuth, (req, res) => {
    const rows = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY rowid DESC").all(req.user.id);
    res.json({ orders: rows.map(formatOrder) });
});

// --- მფლობელისთვის: ყველა შეკვეთა (საიდუმლო გასაღებით) ---
// გამოძახება: curl -H "x-admin-key: <ADMIN_KEY>" http://localhost:3000/api/admin/orders

app.get("/api/admin/orders", (req, res) => {
    if (!ADMIN_KEY || req.get("x-admin-key") !== ADMIN_KEY) {
        return res.status(403).json({ error: "წვდომა აკრძალულია" });
    }
    const rows = db.prepare(`
        SELECT o.*, u.name AS customer, u.email AS customer_email
        FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.rowid DESC
    `).all();
    res.json({ orders: rows.map(o => ({ ...formatOrder(o), customer: o.customer, email: o.customer_email })) });
});

const ORDER_STATUSES = ["new", "in_progress", "ready"];

// სტატუსის შეცვლა: curl -X PATCH -H "x-admin-key: <ADMIN_KEY>" -H "Content-Type: application/json" \
//   -d "{\"status\":\"ready\"}" http://localhost:3000/api/admin/orders/ORD-XXXX/status
app.patch("/api/admin/orders/:id/status", (req, res) => {
    if (!ADMIN_KEY || req.get("x-admin-key") !== ADMIN_KEY) {
        return res.status(403).json({ error: "წვდომა აკრძალულია" });
    }
    const status = str(req.body.status, 20);
    if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ error: "სტატუსი უნდა იყოს: " + ORDER_STATUSES.join(", ") });
    }
    const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "შეკვეთა ვერ მოიძებნა" });
    res.json({ ok: true, status });
});

app.use((err, req, res, next) => res.status(400).json({ error: "არასწორი მოთხოვნა" }));

app.listen(PORT, () => console.log(`სერვერი მუშაობს: http://localhost:${PORT}`));