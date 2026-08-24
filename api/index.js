const axios = require('axios');

const MIDTRANS_SERVER_KEY = 'Mid-server-gkJ0rfLlWuCQoZr4x1gc5yrH';
const IS_PRODUCTION = false;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: 'Please use POST method'
        });
    }

    try {
        const { order_id, gross_amount, customer_name, customer_email, customer_phone, item_details, custom_data } = req.body;

        if (!order_id) {
            return res.status(400).json({ error: 'order_id is required' });
        }

        if (!gross_amount || isNaN(gross_amount) || gross_amount <= 0) {
            return res.status(400).json({ error: 'gross_amount must be a positive number' });
        }

        const midtransUrl = IS_PRODUCTION 
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

        const payload = {
            transaction_details: {
                order_id: order_id,
                gross_amount: parseInt(gross_amount)
            },
            customer_details: {
                first_name: customer_name || 'Customer',
                email: customer_email || 'customer@email.com',
                phone: customer_phone || '08123456789'
            },
            item_details: item_details || [{
                id: 'sewa',
                name: 'Sewa Akun',
                price: parseInt(gross_amount),
                quantity: 1
            }],
            custom_field1: JSON.stringify(custom_data || {})
        };

        console.log('📦 Creating Midtrans transaction:', payload);

        const auth = Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');

        const response = await axios.post(
            midtransUrl,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`
                },
                timeout: 30000
            }
        );

        console.log('✅ Transaction created:', response.data);

        res.status(200).json({
            success: true,
            token: response.data.token,
            redirect_url: response.data.redirect_url
        });

    } catch (error) {
        console.error('❌ Error creating transaction:', error.message);
        
        let errorDetail = error.message;
        if (error.response) {
            console.error('❌ Response data:', error.response.data);
            errorDetail = error.response.data?.message || error.response.data || error.message;
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create transaction',
            detail: errorDetail
        });
    }
};
