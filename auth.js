// XSS-ისგან დაცვა: მომხმარებლის შეყვანილი ტექსტი ყოველთვის ესქეიპდება innerHTML-ში ჩასმამდე
function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// redirect-ად მხოლოდ საიტის შიდა .html გვერდები დაიშვება (სხვა საიტზე გადამისამართების თავიდან ასაცილებლად)
function safeRedirect(target, fallback) {
    return /^[\w-]+\.html$/.test(target || "") ? target : fallback;
}

const USERS_KEY = "users";
const SESSION_KEY = "currentUser";

// --- მომხმარებლების შენახვა (ბრაუზერის localStorage-ში) ---

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (e) {
        console.error("მომხმარებლების წაკითხვის შეცდომა:", e);
        return [];
    }
}

function saveUsers(users) {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
        console.error("მომხმარებლების შენახვის შეცდომა:", e);
    }
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
        return null;
    }
}

function setCurrentUser(user) {
    // სესიაში მხოლოდ არასაიდუმლო მონაცემები ინახება, არასდროს პაროლი/ჰეში
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email
    }));
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    renderNavAuth();
    window.location.href = "index.html";
}

// --- პაროლის ჰეშირება (SHA-256 + შემთხვევითი salt) ---
// შენიშვნა: ეს მხოლოდ საწყისი დაცვაა frontend-only დემო პროექტისთვის.
// namdvili წარმოებისთვის აუცილებელია server-side ავთენტიფიკაცია.

function generateSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(salt + ":" + password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- ნავიგაციაში ანგარიშის ზონის დახატვა ---

function renderNavAuth() {
    const container = document.getElementById("nav-auth");
    if (!container) return;

    const user = getCurrentUser();

    if (user) {
        container.innerHTML = `
            <span class="nav-user">მოგესალმებით, <strong>${escapeHtml(user.name)}</strong></span>
            <a href="account.html">ჩემი შეკვეთები</a>
            <button type="button" id="logout-btn" class="nav-logout">გასვლა</button>
        `;
        document.getElementById("logout-btn").addEventListener("click", logout);
    } else {
        container.innerHTML = `
            <a href="login.html">შესვლა</a>
            <a href="register.html">რეგისტრაცია</a>
        `;
    }
}

renderNavAuth();