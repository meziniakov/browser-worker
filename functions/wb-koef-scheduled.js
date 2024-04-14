const sendMessage = require('../lib/telegram/wb_acceptance_rate/sendMessage');
const editMessage = require('../lib/telegram/wb_acceptance_rate/editMessage');
const client = require('../lib/supabase/wb_acceptance/client');
const https = require('https');

export default async (req) => {
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
	// let test = await sendMessage(305905070, `Пробное сообщение`);

	const { data, error } = await client.from('requests').select('*').eq('is_active', true);

	if (data) {
		data.forEach(async (req) => {
			const response = await fetch('https://coef.wbcon.su/get_coef', {
				method: 'POST',
				agent: new https.Agent({
					rejectUnauthorized: false,
				}),
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36',
				},
				body: JSON.stringify({
					wh_id: req.wh_id,
					delivery_date: req.delivery_date,
					delivery_type: req.delivery_type,
				}),
			});
			const fetchKoef = await response.json();
			if (fetchKoef?.coef == 0) {
				await client.from('requests').update({ is_active: false }).eq('id', req.id);
			}
			let send = await sendMessage(req.user_id, `Коээфициент по складу ${req.wh_id} сейчас: ${fetchKoef.coef}`);
			setTimeout(() => {}, 5000);
		});
	}
};
