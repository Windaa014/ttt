const axios = require('axios');

const MIDTRANS_SERVER_KEY = 'Mid-server-gkJ0rfLlWuCQoZr4x1gc5yrH';
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/Windaa014/ttt/main/stock-sewa.json';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { order_id } = req.query;

        if (!order_id) {
            return res.status(400).json({ error: 'order_id required' });
        }

        // Cek status ke Midtrans
        const midtransUrl = `https://api.sandbox.midtrans.com/v2/${order_id}/status`;

        const response = await axios.get(midtransUrl, {
            headers: {
                'Authorization': `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64')}`
            }
        });

        const data = response.data;

        // Ambil akun dari GitHub (cari yang status ready)
        let accountData = {};
        try {
            const ghRes = await axios.get(GITHUB_RAW_URL + '?v=' + Date.now());
            const items = ghRes.data;
            
            // Cari akun dengan status ready (ambil yang pertama)
            const readyAccount = items.find(item => item.status === 'ready');
            if (readyAccount) {
                accountData = {
                    email: readyAccount.email || 'akunff123@gmail.com',
                    password: readyAccount.password || 'rahasia123',
                    uid: readyAccount.uid || '2033423066',
                    foto: readyAccount.foto || ''
                };
            }
        } catch (e) {
            console.log('Gagal ambil akun dari GitHub:', e.message);
        }

        // Kirim response
        res.status(200).json({
            status: data.transaction_status,
            order_id: data.order_id,
            gross_amount: data.gross_amount,
            payment_type: data.payment_type,
            // Kirim data akun dari GitHub
            email: accountData.email || 'akunff123@gmail.com',
            password: accountData.password || 'rahasia123',
            uid: accountData.uid || '2033423066',
            foto: accountData.foto || ''
        });

    } catch (error) {
        console.error('❌ Check payment error:', error.message);
        res.status(500).json({ 
            error: 'Failed to check payment',
            detail: error.response?.data || error.message
        });
    }
};
