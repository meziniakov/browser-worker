const sendMessage = require('../lib/telegram/sendMessage');
const client = require('../lib/supabase/subscribe/client');

export default async (req) => {
	//1. Запускаем скрипт каждые 3 минуты (ставим в крон задание)
	//2. Скрипт запрашивает конкурсы, в которых статус pending и finish_date < now() (func get_all_finish_date)
	//3. Если массив конкурсов не пустой - запрашиваем в цикле chat_member со статусом member и выбираем рандомно winner_count

	//return finish_date_array[]
	const { data: finish_date_array, error: finishDateArrayError } = await client
		.rpc('get_all_finish_date')
		.select('title, status, winner_count, chat_id')
		.eq('status', 'pending');

	//3. Если массив конкурсов не пустой - проходим в цикле по конкурсам и последовательно запрашиваем chat_member со статусом member и выбираем рандомно winner_count
	console.log('finish_date_array: ', finish_date_array);

	if (finish_date_array.length > 0) {
		for await (const contest of finish_date_array) {
			const { data: winners, error: winnerError } = await client.rpc('get_random_users_winner', { chatid: contest?.chat_id });

			if (winners?.length > 0) {
				await sendMessage(
					chat.id,
					`Конкурс "${contest.title}":\n${
						winners.length > 0 ? winners.map((i, _) => `${++_}. ${i.first_name} ${i.last_name}`).join('\n') : 'Нет победителей\n'
					}`
				);
				for await (const winner of winners) {
					await sendMessage(winner.user_id, `Поздравляем, вы стали победителем в конкурсе ${contest.title}`);
				}
			}
			const { data, error } = await client.from('contest_config').update({ status: 'done' }).eq('id', contest.id).select('*');
			console.log('contest done: ', data);
			console.log('contest done error: ', error);
		}
	} else {
		return { statusCode: 200 };
	}
};
