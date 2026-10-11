const ordersContainer = document.getElementById("orders-container");
const currentUser = getCurrentUser();

if (!currentUser) {
    window.location.href = "login.html?redirect=account.html";
} else {
    renderOrders();
}

function renderOrders() {
    const orders = getOrders().filter(o => o.userId === currentUser.id).reverse();

    if (orders.length === 0) {
        ordersContainer.innerHTML = `<div class="empty-cart"><p>შეკვეთები ჯერ არ გაქვთ</p><a href="index.html">დაათვალიერეთ თაიგულები &rarr;</a></div>`;
        return;
    }

    ordersContainer.innerHTML = orders.map(o => {
        const next = nextStatus(o.status);
        return `
        <div class="order-card">
            <div class="order-head">
                <strong>${escapeHtml(o.id)}</strong>
                <span class="status-badge status-${escapeHtml(o.status || "new")}">${escapeHtml(statusLabel(o.status))}</span>
            </div>
            <p class="order-meta">${new Date(o.createdAt).toLocaleDateString("ka-GE")} · მიწოდება: ${escapeHtml(o.delivery.date)} · ${escapeHtml(o.delivery.address)}</p>
            ${o.items.map(i => `<div class="summary-row"><span>${escapeHtml(i.name)} × ${i.qty}</span><span>${formatPrice(i.price * i.qty)}</span></div>`).join("")}
            <div class="summary-row total-row"><span>ჯამი</span><span>${formatPrice(o.total)}</span></div>
            <div class="order-actions">
                <button type="button" class="reorder-btn" data-id="${escapeHtml(o.id)}">ხელახლა შეკვეთა</button>
                ${next ? `<button type="button" class="advance-btn" data-id="${escapeHtml(o.id)}" data-next="${next}">სტატუსის განახლება: ${escapeHtml(statusLabel(next))}</button>` : ""}
            </div>
        </div>`;
    }).join("");

    ordersContainer.querySelectorAll(".reorder-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const order = orders.find(o => o.id === btn.dataset.id);
            order.items.forEach(i => {
                for (let n = 0; n < i.qty; n++) addToCart({ id: i.id, name: i.name, price: i.price, img: i.img });
            });
            window.location.href = "kalata.html";
        });
    });

    // შენიშვნა: ეს ღილაკი დემოსთვისაა — სტატუსს ნამდვილ მაღაზიაში მხოლოდ
    // თქვენ (მაღაზიის პატრონი) უნდა ცვლიდეთ, არა მომხმარებელი. როცა საიტი
    // ბექენდზე გადავა, ამის ნაცვლად გამოიყენეთ server.js-ის admin მარშრუტი.
    ordersContainer.querySelectorAll(".advance-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            updateOrderStatus(btn.dataset.id, btn.dataset.next);
            renderOrders();
        });
    });
}