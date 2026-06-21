// app.js - Corrected Pi Payment Flow
let piSDKInitialized = false;

async function initPiSDK() {
    if (piSDKInitialized) return;
    try {
        await Pi.init({ version: "2.0", sandbox: true }); // ← Change to false in production
        piSDKInitialized = true;
        console.log("Pi SDK initialized successfully");
    } catch (error) {
        console.error("Pi SDK init failed:", error);
        alert("Pi SDK ba zai iya farawa ba. Yi amfani da Pi Browser.");
    }
}

function showBookingModal() {
    document.getElementById('adminModal').style.display = 'flex';
}

function showAdminModal() {
    document.getElementById('adminModal').style.display = 'flex';
}

async function initiatePiPayment() {
    await initPiSDK();

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const shelterType = document.getElementById('shelterType').value;
    let amount = parseFloat(document.getElementById('amount').value);

    if (!name || !phone || !amount || amount <= 0) {
        alert("Da fatan za ka cika duk filin da ake buƙata.");
        return;
    }

    const paymentData = {
        amount: amount,
        memo: `Zamani Shelters - ${shelterType} by ${name}`,
        metadata: { customerName: name, phone, shelterType }
    };

    const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
            await fetch('/api/approve-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId, customerName: name, phone, shelterType, amount })
            });
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
            await fetch('/api/complete-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId, txid, customerName: name, phone, shelterType, amount })
            });
            alert(`🎉 Biya ta samu nasara!\nPayment ID: ${paymentId}`);
        },

        onCancel: () => alert("Biyan kuɗi ya cancel."),
        onError: (error) => alert("Kuskure: " + (error.message || error))
    };

    try {
        await Pi.createPayment(paymentData, callbacks);
    } catch (err) {
        console.error(err);
        alert("Kuskure yayi yayin fara biyan kuɗi.");
    }
}

// Admin Functions
function loginAdmin() {
    const pass = document.getElementById('adminPass').value;
    if (pass === "zamani2026") {   // Change this password!
        document.getElementById('adminPanel').style.display = 'block';
        loadPendingPayments();
    } else {
        alert("Kuskuren kalmar sirri!");
    }
}

async function loadPendingPayments() {
    const container = document.getElementById('pendingList');
    container.innerHTML = "Loading...";

    try {
        const res = await fetch('/api/approve-payment');
        const data = await res.json();
        
        if (data.payments && data.payments.length > 0) {
            let html = '';
            data.payments.forEach(p => {
                html += `
                    <div class="payment-item">
                        <div>
                            <strong>${p.customerName}</strong><br>
                            ${p.phone} • ${p.shelterType} • ${p.amount} Pi
                        </div>
                        <button onclick="approvePayment('${p.paymentId}')" style="background:#10b981;">Yarda</button>
                    </div>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = "<p>Babu pending payments.</p>";
        }
    } catch (e) {
        container.innerHTML = "<p>Kuskure yayi yayin loading.</p>";
    }
}

async function approvePayment(paymentId) {
    if (!confirm("Ka tabbata?")) return;
    try {
        await fetch('/api/approve-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId })
        });
        alert("An yarda da biyan kuɗi.");
        loadPendingPayments();
    } catch (e) {
        alert("Kuskure yayi.");
    }
}

window.onclick = function(e) {
    if (e.target.id === 'adminModal') {
        document.getElementById('adminModal').style.display = 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initPiSDK();
    // Auto update amount
    const select = document.getElementById('shelterType');
    const amountInput = document.getElementById('amount');
    select.addEventListener('change', () => {
        amountInput.value = select.value === 'monthly' ? 50 : 20;
    });
};
