const sendMessage = require('../lib/telegram/sendMessage');
const client = require('../lib/supabase/subscribe/client');

export default async (req) => {
	//1. Запускаем скрипт каждые 3 минуты (ставим в крон задание)
	//2. Скрипт запрашивает конкурсы, в которых статус pending и start_date > now() (func get_start_all_date)
	//3. Если массив конкурсов не пустой - запрашиваем в цикле chat_member со статусом member и выбираем рандомно winner_count

	//return finish_date[]
	const { data: finish_date_array, error: finishDateArrayError } = await client
		.rpc('get_all_finish_date')
		.select('title, status, winner_count, chat_id')
		.eq('status', 'pending');

	let winner_message = [];

	//3. Если массив конкурсов не пустой - проходим в цикле по конкурсам и последовательно запрашиваем chat_member со статусом member и выбираем рандомно winner_count
	if (finish_date_array.length > 0) {
		for await (const contest of finish_date_array) {
			const { data: winners, error: winnerError } = await client.rpc('get_random_users_winner', { chatid: contest?.chat_id });

			if (winners?.length) {
				await sendMessage(chat.id, `Поздравляем победителей:\n${winner_message.join('\n')}`);
				await sendMessage(
					chat.id,
					`Конкурс "${contest.title}":\n${
						winners.length == 0 ? 'Нет победителей\n' : winners.map((i, _) => `${++_}. ${i.first_name} ${i.last_name}`).join('\n')
					}`
				);
			}
		}
	} else {
		return { statusCode: 200 };
	}
};
