const sendMessage = require('../lib/telegram/wb_acceptance_rate/sendMessage');
const editMessage = require('../lib/telegram/wb_acceptance_rate/editMessage');
const client = require('../lib/supabase/wb_acceptance/client');
const https = require('https');

export default async (req) => {
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
	console.log('req ', await req.json());
	let test = await sendMessage(305905070, `Пробное сообщение`);

	const { data, error } = await client.from('requests').select('*').eq('is_active', true);

	// const request = await fetch(
	// 	'https://api.datanewton.ru/v1/counterparty?key=mi76aFMdgvml&filters=OWNER_BLOCK%2CADDRESS_BLOCK&inn=9728006808'
	// );
	// const response = await request.json();
	// console.log('request ', request);
	// console.log('response ', response);

	// const response = await fetch('https://coef.wbcon.su/get_coef', {
	// 	method: 'POST',
	// 	agent: new https.Agent({
	// 		rejectUnauthorized: false,
	// 	}),
	// 	headers: {
	// 		'Content-Type': 'application/json',
	// 		'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36',
	// 	},
	// 	body: JSON.stringify({
	// 		wh_id: data[0].wh_id,
	// 		delivery_date: data[0].delivery_date,
	// 		delivery_type: data[0].delivery_type,
	// 	}),
	// });
	// const fetchKoef = await response.json();

	// let send = await editMessage(
	// 	305905070,
	// 	test.result.message_id,
	// 	null,
	// 	`Компания ${response.company.company_names.short_name} \nSklad: ${data[0].wh_id}`
	// );
	// let send = await editMessage(305905070, test.result.message_id, null, `Коээфициент по складу ${data[0].wh_id} сейчас: ${fetchKoef.coef}`);
	// console.log('response ', response);
	// console.log('fetchKoef ', fetchKoef);
	// console.log('send ', send);

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
			let send = await editMessage(305905070, test.result.message_id, null, `Коээфициент по складу ${req.wh_id} сейчас: ${fetchKoef.coef}`);
			console.log('fetchKoef ', fetchKoef);
			console.log('send ', send);
		});
	}
};
