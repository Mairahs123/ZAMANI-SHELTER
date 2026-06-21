// api/complete-payment.js
const PI_API_KEY = process.env.PI_API_KEY;

let paymentsDB = [];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        const { paymentId, txid, customerName, phone, shelterType, amount } = req.body;

        if (!paymentId || !txid) {
            return res.status(400).json({ success: false, message: "paymentId and txid required" });
        }

        try {
            const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${PI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ txid })
            });

            const data = await piRes.json();
            if (!piRes.ok) throw new Error(data.message || "Pi completion failed");

            const payment = paymentsDB.find(p => p.paymentId === paymentId);
            if (payment) payment.status = 'completed';

            return res.status(200).json({ success: true, message: "Payment completed" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    res.status(405).json({ success: false, message: "Method not allowed" });
}
