const sendMessage = require('../lib/telegram/wb_acceptance_rate/sendMessage');
const editMessage = require('../lib/telegram/wb_acceptance_rate/editMessage');
const client = require('../lib/supabase/wb_acceptance/client');
// const http = require('http')

export default async (req) => {
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
	console.log('req ', await req.json());
	let test = await sendMessage(305905070, `Пробное сообщение`);

	const { data, error } = await client.from('requests').select('*').eq('is_active', true);

	const req = await fetch('https://jsonplaceholder.typicode.com/todos/1');
	const res = await req.json();
	console.log('req ', req);
	console.log('res ', res);

	// const response = await fetch('https://coef.wbcon.su/get_coef', {
	// 	method: 'POST',
	// 	// agent:
	// 	// rejectUnauthorized: false,
	// 	headers: {
	// 		'Content-Type': 'application/json',
	// 	},
	// 	body: JSON.stringify({
	// 		wh_id: data[0].wh_id,
	// 		delivery_date: data[0].delivery_date,
	// 		delivery_type: data[0].delivery_type,
	// 	}),
	// });
	// const fetchKoef = await response.json();
	let send = await editMessage(305905070, test.result.message_id, null, `Коээфициент по складу ${data[0].wh_id} сейчас: ${res.title}`);
	console.log('send ', send);
	// console.log('fetchKoef ', fetchKoef);
	// console.log('send ', send);

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
