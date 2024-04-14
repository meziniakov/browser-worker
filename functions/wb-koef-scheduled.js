const sendMessage = require('../lib/telegram/wb_acceptance_rate/sendMessage');
const client = require('../lib/supabase/wb_acceptance/client');

export default async (req) => {
	console.log('req ', req.json());
	// const { next_run } = await req.json();

	const { data, error } = await client.from('requests').select('*');

	console.log('data ', data);
	console.log('error ', error);

	// const response = await fetch('https://coef.wbcon.su/get_coef', {
	// 	method: 'POST',
	// 	headers: {
	// 		'Content-Type': 'application/json',
	// 	},
	// 	body: JSON.stringify({
	// 		wh_id: request[0].wh_id,
	// 		delivery_date: request[0].delivery_date,
	// 		delivery_type: request[0].delivery_type,
	// 	}),
	// });

	// const fetchKoef = await response.json();
	// console.log('fetchKoef ', fetchKoef);

	let send = await sendMessage(305905070, 'Выполнение функции раз в 5 минут');
	console.log('send Message ', send);

	console.log('Received event! Next invocation at:');
};
