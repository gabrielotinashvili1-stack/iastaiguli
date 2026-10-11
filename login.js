const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

const redirectTarget = safeRedirect(new URLSearchParams(window.location.search).get("redirect"), null);

if (redirectTarget) {
    const note = document.getElementById("redirect-note");
    if (note) note.hidden = false;

    const switchLink = document.querySelector(".auth-switch a");
    if (switchLink) {
        const url = new URL(switchLink.href, window.location.href);
        url.searchParams.set("redirect", redirectTarget);
        switchLink.href = url.pathname + url.search;
    }
}

loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    loginError.textContent = "";

    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        loginError.textContent = "გთხოვთ, შეავსოთ ყველა ველი.";
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        loginError.textContent = "ამ ელფოსტით მომხმარებელი ვერ მოიძებნა.";
        return;
    }

    const attemptHash = await hashPassword(password, user.salt);
    if (attemptHash !== user.passwordHash) {
        loginError.textContent = "პაროლი არასწორია.";
        return;
    }

    setCurrentUser(user);
    window.location.href = redirectTarget || "index.html";
});