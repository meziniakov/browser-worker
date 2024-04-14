const sendMessage = require('../lib/telegram/wb_acceptance_rate/sendMessage');
const client = require('../lib/supabase/wb_acceptance/client');

export default async (req) => {
	console.log('req ', req);
	const { next_run } = await req.json();

	const request = await client.from('requests').select('*');

	console.log('request ', request[0]);

	// fetch('https://coef.wbcon.su/get_coef', {
	// 	method: 'POST',
	// 	headers: {
	// 		'Content-Type': 'application/json'
	// 	},
	// 	body: JSON.stringify()
	// })

	let send = await sendMessage(305905070, 'Выполнение функции раз в 5 минут');
	console.log('send Message ', send);

	console.log('Received event! Next invocation at:', next_run);
};
