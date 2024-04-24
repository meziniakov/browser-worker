const client = require('../lib/supabase/wb_acceptance/client');

export default async (req) => {
	process.env.TZ = 'Europe/Moscow';

	await sendMessage(305905070, `Дата и время на сервере: ${new Date()}`);

	//выборка активных запросов с датой меньше текущей даты
	const { data: expiredRequests, error: expiredRequestsError } = await client
		.from('requests')
		.select('id, user_id')
		.eq('is_active', true)
		.filter('delivery_date', 'lt', new Date().toISOString().split('T')[0]);

	//выбранным id запросов устанавливаем is_active: false
	const { data, error } = await client
		.from('requests')
		.upsert(
			expiredRequests.map((expiredRequest) => {
				return { ...expiredRequest, is_active: false };
			})
		)
		.select('*');

	console.log('Истекшие запросы: ', expiredRequests);
	console.log('Не активные запросы: ', data);
	console.log('error ', error);
	console.log('expiredRequestsError ', expiredRequestsError);
};
