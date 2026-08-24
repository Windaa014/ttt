const axios = require('axios');

// ===== KONFIGURASI =====
const BOT_TOKEN = '8590293720:AAEAq7FYlab9FGCZ1s6I6w8jEiX56wDtzNQ';
const ADMIN_CHAT_ID = '7506412328';
const GITHUB_TOKEN = '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';

module.exports = async (req, res) => {
    console.log('📥 Webhook hit!');
    
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { order_id, transaction_status, custom_field1 } = req.body;

        let customData = {};
        try {
            customData = JSON.parse(custom_field1 || '{}');
        } catch (e) {}

        const isSuccess = transaction_status === 'settlement' || transaction_status === 'capture';

        // ===== RESPONSE DULU =====
        res.status(200).json({ 
            status: 'ok',
            message: 'Webhook received'
        });

        if (!isSuccess) {
            console.log(`⏳ Status: ${transaction_status} - skip`);
            return;
        }

        console.log('✅ Payment success!');

        // ===== 1. KIRIM TELEGRAM =====
        let msg = `
✅ *PAYMENT SUCCESS!*

🆔 Order: ${order_id}
📱 Produk: ${customData.produk || 'Sewa Akun'}
⏰ Durasi: ${customData.durasi || '-'}
💰 Harga: ${customData.harga ? 'Rp ' + Number(customData.harga).toLocaleString('id-ID') : '-'}
🏷️ Kategori: ${customData.kategori || 'pelajar'}

🔑 *AKUN AKAN DIKIRIM DALAM 1 MENIT!*
        `;

        if (customData.latitude && customData.longitude) {
            const googleMapsLink = `https://www.google.com/maps?q=${customData.latitude},${customData.longitude}`;
            msg += `
📍 *LOKASI USER*
└ Latitude: ${customData.latitude}
└ Longitude: ${customData.longitude}
└ Akurasi: ${customData.accuracy || '-'} meter
└ 📍 [Lihat di Google Maps](${googleMapsLink})
            `;
        }

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: ADMIN_CHAT_ID,
            text: msg,
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        });

        console.log('✅ Telegram sent!');

        // ===== 2. TRIGGER GITHUB ACTION =====
        try {
            await axios.post(
                `https://api.github.com/repos/Windaa014/ttt/dispatches`,
                {
                    event_type: 'sewa-paid',
                    client_payload: {
                        produk: customData.produk || 'Sewa Akun Free Fire',
                        kategori: customData.kategori || 'pelajar',
                        order_id: order_id
                    }
                },
                {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    timeout: 5000
                }
            );
            console.log('✅ GitHub Action triggered!');
        } catch (ghError) {
            console.error('❌ GitHub Action trigger error:', ghError.message);
            // Fallback: update langsung pake API (tapi riskan timeout)
            try {
                await updateGitHubDirect(customData.produk, customData.kategori);
            } catch (fallbackError) {
                console.error('❌ Fallback error:', fallbackError.message);
            }
        }

    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
};

// ===== FALLBACK: UPDATE LANGSUNG KE GITHUB =====
async function updateGitHubDirect(produk, kategori) {
    const GITHUB_API_URL = 'https://api.github.com/repos/Windaa014/ttt/contents/stock-sewa.json';
    
    console.log('🔄 Fallback: Updating GitHub directly...');
    
    const getRes = await axios.get(GITHUB_API_URL, {
        headers: {
            'Authorization': `token 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`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    const content = Buffer.from(getRes.data.content, 'base64').toString('utf8');
    const sewaData = JSON.parse(content);

    const itemIndex = sewaData.findIndex(item => 
        item.nama === produk && 
        item.kategori === kategori && 
        item.status === 'ready'
    );

    if (itemIndex !== -1) {
        sewaData[itemIndex].status = 'rented';
        const expired = new Date();
        expired.setHours(expired.getHours() + 24);
        sewaData[itemIndex].expired_at = expired.toISOString();

        await axios.put(GITHUB_API_URL, {
            message: `[AUTO] ${produk} - rented`,
            content: Buffer.from(JSON.stringify(sewaData, null, 2)).toString('base64'),
            sha: getRes.data.sha,
            branch: 'main'
        }, {
            headers: {
                'Authorization': `token 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`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        console.log('✅ Fallback: GitHub updated!');
    }
}
