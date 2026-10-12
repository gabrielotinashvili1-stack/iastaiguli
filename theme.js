// გამუქების რეჯიმი: იმახსოვრებს არჩევანს, ხოლო პირველად სისტემის პარამეტრს მიჰყვება.
// ეს სკრიპტი <head>-ში იტვირთება, რომ გვერდი თეთრად არ აციმციმდეს.
(function () {
    function savedTheme() {
        try { return localStorage.getItem("theme"); } catch (e) { return null; }
    }

    function currentTheme() {
        return savedTheme() || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }

    function apply(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const btn = document.getElementById("theme-toggle");
        if (btn) {
            btn.textContent = theme === "dark" ? "☀️" : "🌙";
            btn.setAttribute("aria-label", theme === "dark" ? "ნათელი რეჯიმი" : "გამუქების რეჯიმი");
            btn.title = btn.getAttribute("aria-label");
        }
    }

    apply(currentTheme());

    document.addEventListener("DOMContentLoaded", function () {
        const nav = document.querySelector(".nav");
        if (!nav) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "theme-toggle";
        btn.className = "theme-toggle";
        nav.appendChild(btn);
        apply(document.documentElement.getAttribute("data-theme"));

        btn.addEventListener("click", function () {
            const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            try { localStorage.setItem("theme", next); } catch (e) {}
            apply(next);
        });
    });
})();