const CART_KEY = "cart";

// --- საერთო კალათის ფუნქციები (გამოიყენება main.js-შიც და cart.js-შიც) ---

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
        console.error("კალათის წაკითხვის შეცდომა:", e);
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
        console.error("კალათის შენახვის შეცდომა:", e);
    }
}

function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    saveCart(cart);
    updateCartBadge();
}

function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartBadge() {
    const badge = document.getElementById("cart-count");
    if (badge) {
        badge.textContent = getCartCount();
    }
}

function formatPrice(amount) {
    const rounded = Math.round(amount * 100) / 100;
    const text = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
    return `${text}₾`;
}

// --- შეკვეთის სტატუსები ---

const ORDER_STATUSES = ["new", "in_progress", "ready"];
const STATUS_LABELS = {
    new: "მიღებულია",
    in_progress: "მიმდინარეობს",
    ready: "მზადაა"
};

function statusLabel(status) {
    return STATUS_LABELS[status] || STATUS_LABELS.new;
}

function nextStatus(status) {
    const idx = ORDER_STATUSES.indexOf(status);
    return idx >= 0 && idx < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[idx + 1] : null;
}

function updateOrderStatus(orderId, status) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = status;
        saveOrders(orders);
    }
    return order;
}

// --- შეკვეთები ---

function getOrders() {
    try {
        return JSON.parse(localStorage.getItem("orders")) || [];
    } catch (e) {
        return [];
    }
}

function saveOrders(orders) {
    try {
        localStorage.setItem("orders", JSON.stringify(orders));
    } catch (e) {
        console.error("შეკვეთის შენახვის შეცდომა:", e);
    }
}

function placeOrder(user, items, delivery) {
    const order = {
        id: "ORD-" + Date.now().toString(36).toUpperCase(),
        userId: user.id,
        createdAt: new Date().toISOString(),
        items,
        total: items.reduce((sum, i) => sum + i.price * i.qty, 0),
        delivery,
        status: "new"
    };
    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);
    saveCart([]);
    updateCartBadge();
    return order;
}

function buildOrderMessage(order) {
    const d = order.delivery;
    const lines = [
        `🌸 ახალი შეკვეთა ${order.id}`,
        ...order.items.map(i => `• ${i.name} × ${i.qty} — ${formatPrice(i.price * i.qty)}`),
        `სულ: ${formatPrice(order.total)}`,
        "",
        `სახელი: ${d.name}`,
        `ტელეფონი: ${d.phone}`,
        `მისამართი: ${d.address}`,
        `მიწოდება: ${d.date}${d.time ? " " + d.time : ""}`
    ];
    if (d.card) lines.push(`ბარათის ტექსტი: ${d.card}`);
    if (d.note) lines.push(`კომენტარი: ${d.note}`);
    return lines.join("\n");
}

// --- პროდუქტის გვერდზე "კალათაში დამატება" ღილაკების დამუშავება ---

document.querySelectorAll(".add-cart").forEach(button => {
    button.addEventListener("click", function () {
        const product = {
            id: this.getAttribute("data-id") || this.getAttribute("data-name"),
            name: this.getAttribute("data-name"),
            price: parseFloat(this.getAttribute("data-price")) || 0,
            img: this.getAttribute("data-img")
        };

        addToCart(product);
        alert(`${product.name} დაემატა კალათაში!`);
    });
});

// კალათის საზონდარო ბეჯის განახლება ყოველ გვერდზე ჩატვირთვისას
updateCartBadge();