const cartContainer = document.getElementById("cart-container");

function renderCart() {
    const cart = getCart();
    cartContainer.innerHTML = "";

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <p>კალათა ცარიელია</p>
                <a href="index.html">დაათვალიერეთ თაიგულები &rarr;</a>
            </div>
        `;
        return;
    }

    let total = 0;

    cart.forEach((item, index) => {
        const subtotal = item.price * item.qty;
        total += subtotal;

        const itemDiv = document.createElement("div");
        itemDiv.classList.add("cart-item");
        itemDiv.innerHTML = `
            <img src="${item.img}" alt="${item.name}" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23f3dbe0%22/%3E%3C/svg%3E';">
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p class="unit-price">${formatPrice(item.price)} / ცალი</p>
            </div>
            <div class="qty-controls">
                <button type="button" class="qty-btn" data-action="decrease" data-index="${index}" aria-label="რაოდენობის შემცირება">−</button>
                <span>${item.qty}</span>
                <button type="button" class="qty-btn" data-action="increase" data-index="${index}" aria-label="რაოდენობის გაზრდა">+</button>
            </div>
            <div class="item-subtotal">${formatPrice(subtotal)}</div>
            <button type="button" class="remove-item" data-index="${index}">წაშლა</button>
        `;
        cartContainer.appendChild(itemDiv);
    });

    const summaryDiv = document.createElement("div");
    summaryDiv.classList.add("cart-summary");
    summaryDiv.innerHTML = `
        <span>სულ ჯამი:</span>
        <span class="total">${formatPrice(total)}</span>
    `;
    cartContainer.appendChild(summaryDiv);

    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("cart-actions");
    actionsDiv.innerHTML = `
        <button type="button" id="clear-cart">კალათის გასუფთავება</button>
        <button type="button" id="checkout-btn">შეკვეთის გაფორმება</button>
    `;
    cartContainer.appendChild(actionsDiv);

    document.getElementById("clear-cart").addEventListener("click", () => {
        if (confirm("დარწმუნებული ხართ, რომ გსურთ კალათის გასუფთავება?")) {
            saveCart([]);
            renderCart();
            updateCartBadge();
        }
    });

    document.getElementById("checkout-btn").addEventListener("click", () => {
        if (!getCurrentUser()) {
            alert("შეკვეთის გასაფორმებლად საჭიროა ანგარიში. გთხოვთ, დარეგისტრირდეთ ან შეხვიდეთ სისტემაში — კალათა შენარჩუნებული დარჩება.");
            window.location.href = "register.html?redirect=checkout.html";
            return;
        }
        window.location.href = "checkout.html";
    });

    cartContainer.querySelectorAll(".qty-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            const cart = getCart();
            const idx = parseInt(this.getAttribute("data-index"), 10);
            const action = this.getAttribute("data-action");

            if (action === "increase") {
                cart[idx].qty += 1;
            } else if (action === "decrease") {
                cart[idx].qty -= 1;
                if (cart[idx].qty <= 0) {
                    cart.splice(idx, 1);
                }
            }

            saveCart(cart);
            renderCart();
            updateCartBadge();
        });
    });

    cartContainer.querySelectorAll(".remove-item").forEach(btn => {
        btn.addEventListener("click", function () {
            const cart = getCart();
            const idx = parseInt(this.getAttribute("data-index"), 10);
            cart.splice(idx, 1);
            saveCart(cart);
            renderCart();
            updateCartBadge();
        });
    });
}

renderCart();