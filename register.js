const registerForm = document.getElementById("register-form");
const registerError = document.getElementById("register-error");

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

registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    registerError.textContent = "";

    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;

    if (!name || !email || !password || !confirm) {
        registerError.textContent = "გთხოვთ, შეავსოთ ყველა ველი.";
        return;
    }

    if (!isValidEmail(email)) {
        registerError.textContent = "შეიყვანეთ სწორი ელფოსტის მისამართი.";
        return;
    }

    if (password.length < 6) {
        registerError.textContent = "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან.";
        return;
    }

    if (password !== confirm) {
        registerError.textContent = "პაროლები არ ემთხვევა.";
        return;
    }

    const users = getUsers();
    if (users.some(u => u.email === email)) {
        registerError.textContent = "ამ ელფოსტით მომხმარებელი უკვე რეგისტრირებულია.";
        return;
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const newUser = {
        id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
        name,
        email,
        salt,
        passwordHash
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);

    alert(`კეთილი იყოს თქვენი მობრძანება, ${name}! რეგისტრაცია წარმატებით დასრულდა.`);
    window.location.href = redirectTarget || "index.html";
});