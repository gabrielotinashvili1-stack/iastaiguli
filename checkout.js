const user = getCurrentUser();
const cart = getCart();

if (!user) {
    window.location.href = "register.html?redirect=checkout.html";
} else if (cart.length === 0) {
    window.location.href = "kalata.html";
} else {
    initCheckout();
}

function initCheckout() {
    const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    document.getElementById("order-summary").innerHTML =
        "<h3>თქვენი შეკვეთა</h3>" +
        `<div class="summary-items">${cart.map(i => `
            <div class="summary-item">
                <img src="${i.img}" alt="${escapeHtml(i.name)}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23f3dbe0%22/%3E%3C/svg%3E';">
                <div class="summary-item-info">
                    <span class="summary-item-name">${escapeHtml(i.name)}</span>
                    <span class="summary-item-qty">× ${i.qty}</span>
                </div>
                <span class="summary-item-price">${formatPrice(i.price * i.qty)}</span>
            </div>`).join("")}</div>` +
        `<div class="summary-row total-row"><span>სულ ჯამი</span><span>${formatPrice(total)}</span></div>`;

    const now = new Date();
    document.getElementById("co-date").min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    document.getElementById("co-name").value = user.name;

    document.getElementById("checkout-form").addEventListener("submit", e => {
        e.preventDefault();
        const val = id => document.getElementById(id).value.trim();
        const error = document.getElementById("co-error");
        const delivery = { name: val("co-name"), phone: val("co-phone"), address: val("co-address"), date: val("co-date"), time: val("co-time"), card: val("co-card"), note: val("co-note") };

        if (!delivery.name || !delivery.address || !delivery.date) {
            error.textContent = "გთხოვთ, შეავსოთ სახელი, მისამართი და მიწოდების თარიღი.";
        } else if (delivery.phone.replace(/\D/g, "").length < 9) {
            error.textContent = "შეიყვანეთ სწორი ტელეფონის ნომერი.";
        } else if (delivery.date < document.getElementById("co-date").min) {
            error.textContent = "მიწოდების თარიღი წარსულში ვერ იქნება.";
        } else {
            showConfirmation(placeOrder(user, cart, delivery));
        }
    });
}

function showConfirmation(order) {
    const msg = encodeURIComponent(buildOrderMessage(order));
    const links = [];
    if (SHOP_CONFIG.whatsapp) links.push(`<a class="btn-link" href="https://wa.me/${encodeURIComponent(SHOP_CONFIG.whatsapp)}?text=${msg}" target="_blank" rel="noopener">გაგზავნა WhatsApp-ით</a>`);
    if (SHOP_CONFIG.email) links.push(`<a class="btn-link" href="mailto:${encodeURIComponent(SHOP_CONFIG.email)}?subject=${encodeURIComponent("შეკვეთა " + order.id)}&body=${msg}">გაგზავნა ელფოსტით</a>`);
    if (SHOP_CONFIG.phone) links.push(`<a class="btn-link" href="tel:${encodeURIComponent(SHOP_CONFIG.phone)}">დარეკვა</a>`);

    document.getElementById("checkout-root").innerHTML = `
        <div class="confirm-box">
            <div class="confirm-icon">
                <svg viewBox="0 0 52 52" width="52" height="52"><circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M15 27l7 7 15-15"/></svg>
            </div>
            <h3>შეკვეთა მიღებულია!</h3>
            <p class="confirm-sub">მადლობა, ${escapeHtml(order.delivery.name)} — თაიგული მალე თქვენთან იქნება.</p>
            <div class="confirm-details">
                <div class="summary-row"><span>შეკვეთის ნომერი</span><strong>${escapeHtml(order.id)}</strong></div>
                <div class="summary-row"><span>სტატუსი</span><span class="status-badge status-${escapeHtml(order.status || "new")}">${escapeHtml(statusLabel(order.status))}</span></div>
                <div class="summary-row total-row"><span>ჯამი</span><span>${formatPrice(order.total)}</span></div>
            </div>
            ${links.length ? `<p class="confirm-note">სწრაფი დადასტურებისთვის გამოგვიგზავნეთ შეკვეთის დეტალები:</p><div class="confirm-actions">${links.join("")}</div>` : `<p class="confirm-note">მალე დაგიკავშირდებით.</p>`}
            <p class="confirm-links"><a href="account.html">ჩემი შეკვეთები</a> · <a href="index.html">მთავარ გვერდზე დაბრუნება</a></p>
        </div>`;
}