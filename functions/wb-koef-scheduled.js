const sendMessage = require('../lib/telegram/wb_acceptance_rate/sendMessage');
const client = require('../lib/supabase/wb_acceptance/client');
const https = require('https');

export default async (req) => {
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
	// let test = await sendMessage(305905070, `Пробное сообщение`);

	const { data, error } = await client
		.from('requests')
		.select('*, warehouses (title), coefficients (title), delivery_types (title)')
		.eq('is_active', true)
		.filter('delivery_date', 'gte', new Date().toISOString().split('T')[0]);

	if (data) {
		data.forEach(async (req, n) => {
			let delivery_date = new Date(req.delivery_date).toISOString();
			let delivery_date_start = new Date(req.delivery_date_start).toISOString();
			let today = new Date().toISOString();

			if (today <= delivery_date) {
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
						delivery_date: today,
						delivery_type: req.delivery_type,
					}),
				});
				const fetchKoef = await response.json();
				if (fetchKoef?.coef <= req.coef) {
					await client.from('requests').update({ is_active: false }).eq('id', req.id);
					await sendMessage(
						chat.id,
						`Доступна приёмка:\n📦 › ${req.warehouses.title} › ${req.delivery_types.title} › ${req.coefficients.title} › ${
							req.delivery_date_start ? new Date(delivery_date_start).toLocaleDateString('ru-RU') + ' - ' : ''
						} ${new Date(delivery_date).toLocaleDateString('ru-RU')}\n`
					);
					await sendMessage(
						305905070,
						`Доступна приёмка:\n📦 › ${req.warehouses.title} › ${req.delivery_types.title} › ${req.coefficients.title} › ${
							req.delivery_date_start ? new Date(delivery_date_start).toLocaleDateString('ru-RU') + ' - ' : ''
						} ${new Date(delivery_date).toLocaleDateString('ru-RU')}\n`
					);
				}
				setTimeout(() => {}, 5000);
			}
		});
	}
};
