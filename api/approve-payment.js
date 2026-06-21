// api/approve-payment.js
const PI_API_KEY = process.env.PI_API_KEY;

let paymentsDB = [];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'POST') {
        const { paymentId, customerName, phone, shelterType, amount } = req.body;

        if (!paymentId) return res.status(400).json({ success: false, message: "paymentId required" });

        try {
            const piRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${PI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await piRes.json();
            if (!piRes.ok) throw new Error(data.message || "Pi approval failed");

            paymentsDB.push({
                paymentId, customerName, phone, shelterType, amount,
                status: 'approved', approvedAt: new Date().toISOString()
            });

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    if (req.method === 'GET') {
        return res.status(200).json({ success: true, payments: paymentsDB });
    }

    res.status(405).json({ success: false, message: "Method not allowed" });
          }
