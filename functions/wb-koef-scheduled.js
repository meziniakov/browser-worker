const sendMessage = require('../lib/telegram/wb_acceptance_rate/sendMessage');
const client = require('../lib/supabase/wb_acceptance/client');

export default async (req) => {
	console.log('req ', await req.json());

	const { data, error } = await client.from('requests').select('*').eq('is_active', true);

	const response = await fetch('https://coef.wbcon.su/get_coef', {
		method: 'POST',
		rejectUnauthorized: false,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			wh_id: req.wh_id,
			delivery_date: req.delivery_date,
			delivery_type: req.delivery_type,
		}),
	});
	const fetchKoef = await response.json();
	let send = await sendMessage(305905070, `Коээфициент по складу ${req.wh_id} сейчас: ${fetchKoef.coef}`);
	console.log('fetchKoef ', fetchKoef);
	console.log('send ', send);

	// if (data) {
	// 	data.forEach(async (req) => {
	// 		const response = await fetch('https://coef.wbcon.su/get_coef', {
	// 			method: 'POST',
	// 			headers: {
	// 				'Content-Type': 'application/json',
	// 			},
	// 			body: JSON.stringify({
	// 				wh_id: req.wh_id,
	// 				delivery_date: req.delivery_date,
	// 				delivery_type: req.delivery_type,
	// 			}),
	// 		});
	// 		const fetchKoef = await response.json();
	// 		let send = await sendMessage(305905070, `Коээфициент по складу ${req.wh_id} сейчас: ${fetchKoef.coef}`);
	// 		console.log('fetchKoef ', fetchKoef);
	// 		console.log('send ', send);
	// 	});
	// }
};
