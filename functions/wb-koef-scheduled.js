import sendMessage from '../lib/telegram/wb_acceptance_rate/sendMessage';

export default async (req) => {
	console.log('req ', req);
	const { next_run } = await req.json();

	await sendMessage(305905070, 'Выполнение функции раз в 5 минут');

	console.log('Received event! Next invocation at:', next_run);
};
