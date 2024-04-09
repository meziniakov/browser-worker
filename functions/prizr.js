const sendMessage = require('../lib/telegram/sendMessage');
const { setState, getState, clearState } = require('../lib/supabase/subscribe/setState');
const { setContest, getContestByUserId, getAllContest, deleteContest, getContest } = require('../lib/supabase/subscribe/setContest');
const chatMemberChange = require('../lib/supabase/subscribe/chatMemberChange');
const setInviteLink = require('../lib/supabase/subscribe/setInviteLink');
const { getUserById, setUser, getAllUsersByStatus } = require('../lib/supabase/subscribe/setUser');
const { getChatMemberByUserId, addChatMember } = require('../lib/supabase/subscribe/addChatMember');
const client = require('../lib/supabase/subscribe/client');

exports.handler = async function (event, ctx) {
	const {
		message,
		callback_query,
		edited_message,
		channel_post,
		message_reaction,
		pre_checkout_query,
		chat_member,
		my_chat_member,
		chat_join_request,
	} = JSON.parse(event.body);
	// console.log('event.body ', event.body);

	if (callback_query) {
		// console.log('callback_query ', callback_query);
		let { message, data } = callback_query;
		let { contest_id } = await getState(message.chat.id);
		//прерывая процесс добавления конкурса - удаляем запись и обнуляем стейт
		if (data === '/cancel') {
			await clearState(message.chat.id);
			await deleteContest(contest_id);
			await sendMessage(message.chat.id, 'Создание конкурса/розыгрыша прервано');
			return { statusCode: 200 };
		}
	}

	if (chat_member) {
		let user_id = chat_member?.from.id;
		let chat_id = chat_member?.chat.id;
		// console.log('chat_member ', chat_member);
		// console.log('my_chat_member ', my_chat_member);

		let user = await getUserById(user_id);
		let chatMember = await getChatMemberByUserId(user_id, chat_id);
		let chats = await client.from('chats').upsert(chat_member.chat);

		// console.log('user ', user);

		if (user) {
			if (!chatMember.message) {
				chatMember = await chatMemberChange({
					user_id,
					old_status: chat_member?.old_chat_member?.status,
					new_status: chat_member?.new_chat_member?.status,
					invite_link: user.invite_link,
				});
			} else {
				chatMember = await addChatMember({
					user_id,
					chat_id,
					old_status: chat_member?.old_chat_member?.status,
					new_status: chat_member?.new_chat_member?.status,
					invite_link: user?.invite_link,
				});
			}
		} else {
			await setUser(chat_member?.from);
		}

		// console.log(chatMember);
		// console.log('chat_member ', chat_member);

		if (chat_member?.new_chat_member?.status === 'member' || chat_member?.new_chat_member?.status === 'creator') {
			await sendMessage(
				chat_member?.from.id,
				`${chat_member?.from.first_name} ${chat_member?.from.last_name}, спасибо, мы увидели что вы подписались на канал, желаем победы в конкурсе`
			);
		}
		if (chat_member?.new_chat_member?.status === 'left') {
			await sendMessage(
				chat_member?.from.id,
				`${chat_member?.from.first_name} ${chat_member?.from.last_name}, сожалеем, что вы отписались`
			);
		}

		return { statusCode: 200 };
	}

	if (message) {
		const { chat, from, text } = message;
		// return;
		let { state, contest_id } = await getState(from.id);

		if (text === '/me') {
			await sendMessage(chat.id, `id: ${chat.id}\nusername: ${chat.username}`);
		}

		if (text === '/cancel') {
			await clearState(from.id);
			await deleteContest(contest_id);
			return { statusCode: 200 };
		}

		if (text?.split(' ')[0] === '/start') {
			let user = await setUser(from);
			//если есть параметр после start zJgdfJ-fsddfg-dfgfgdh-
			if (text.split(' ')[1]) {
				let hvost = text.split(' ')[1];
				let id = hvost.split('_')[0];
				let invite_link = `+${hvost.replace('_', '+')?.split('+')[1]}`;
				user = await setUser({ ...from, invite_link });

				//проверяем наличие конкурса по contest_id
				let contest = await getContest(id);
				if (contest?.message) {
					await sendMessage(
						'305905070',
						`Произошла ошибка getContest: ${contest?.message}
					\ninvite_link: ${invite_link}
					\ncontest_id: ${id}`
					);
					await sendMessage(user.user_id, `Конкурс не найден.\nПроверьте, пожалуйста ссылку, либо он был удалён!`);
				} else if (contest) {
					let now = new Date().getTime();
					let finish = new Date(contest.finish_date).getTime();
					//проверяем попадает ли в срок подведения итогов
					if (now > finish) {
						await sendMessage(
							user.user_id,
							`Конкурс был завершен ${new Date(contest.finish_date)
								.toLocaleString()
								.replace(/(\d+).(\d+).(\d+), (\d+):(\d+):(\d+)/, '$1.$2.$3 $4:$5')}`
						);
					} else {
						//отправляем текст с условиями конкурса и кнопку подписаться
						console.log(hvost);
						console.log(invite_link);
						console.log(`https://t.me/${invite_link}`);
						await sendMessage(user.user_id, `${contest.message_start}`, {
							inline_keyboard: [[{ text: 'Подписаться', url: `https://t.me/${invite_link}` }]],
						});
					}
				}
			}
		}

		if (text == '/runtest') {
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

						// winner_message.push(
						// 	`Конкурс "${contest.title}":\n${
						// 		winners.length == 0 ? 'Нет победителей\n' : winners.map((i, _) => `${++_}. ${i.first_name} ${i.last_name}`).join('\n')
						// 	}`
						// );
					}
				}
			} else {
				return { statusCode: 200 };
			}

			// await sendMessage(chat.id, `Поздравляем победителей:\n${winner_message.join('\n')}`);
		}

		if (text === '/allcontest' && state === null) {
			let contests = await getAllContest();
			await sendMessage(
				chat.id,
				`Все розыгрыши:\n${contests
					.map(
						(i, _, array) => `${++_}. ${i.title}\n${new Date(i.start_date).toLocaleString()} - ${new Date(i.finish_date).toLocaleString()}`
					)
					.join('\n\n')}`
			);
		}

		if (text === '/allmembers' && state === null) {
			let users = await getAllUsersByStatus(['member', 'creator']);
			console.log(users);

			await sendMessage(
				chat.id,
				`Все участники:\n${users.map((i, _) => `${++_}. ${i.user_id.first_name} ${i.user_id.last_name}\n`).join('\n')}`
			);
		}

		if (text === '/mycontest' && state === null) {
			// let invite_link = await setInviteLink({ user_id: from.id, invite_link: text.split(' ')[1] });
			let contests = await getContestByUserId(from.id);
			console.log('contests ', contests);

			await sendMessage(
				chat.id,
				`Ваши розыгрыши:\n${contests
					.map(
						(i, _, array) =>
							`${++_}. ${i.invite_link.title}\n${array.map((i) => `- ${i.user_id.first_name} ${i.user_id.last_name}`).join('\n')}`
					)
					.join('\n')}`
			);
		}

		if (text === '/id') {
			console.log('chat  ', chat);
			await sendMessage(chat.id, `<code>${chat.id}</code>`);

			return { statusCode: 200 };
		}

		//добавление розыгрыша
		if (text === '/addcontest') {
			await setState({ user_id: from.id, state: null });
			await sendMessage(chat.id, `Введи название розыгрыша`, {
				inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
			});
			let { id } = await setContest({ owner: from.id });
			await setState({ user_id: from.id, state: 'start', contest_id: id });
		}
		if (state == 'start') {
			await sendMessage(chat.id, `Введи текст объявления конкурса`, {
				inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
			});
			await setState({ user_id: from.id, state: 'title' });
			await setContest({ contest_id, owner: from.id, title: text });
		}
		if (state == 'title') {
			await sendMessage(
				chat.id,
				`Введите id канала или группы
			\nЕсли канал - то можно просто переслать боту любое сообщение из целевого канала
			\nЕсли группа - то введите команду <code>/id</code> непосредственно в целевой группе`,
				{
					inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
				}
			);
			await setState({ user_id: from.id, state: 'message_start' });
			await setContest({ contest_id, owner: from.id, message_start: text });
		}
		// if (state == 'chat_id') {
		// 	await sendMessage(
		// 		chat.id,
		// 		`Введи дату начала проведения конкурса
		//   \nОбязательно в формате <code>2024.03.23 19:00</code>`,
		// 		{
		// 			inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
		// 		}
		// 	);
		// 	await setState({ user_id: from.id, state: '3' });
		// 	await setContest({ contest_id, chat_id: chat.id, owner: from.id, message_start: text });
		// }
		if (state == 'message_start') {
			let { forward_origin } = message;
			let chat_id = forward_origin?.chat?.id;
			let next = false;

			if (chat_id) {
				await client.from('chats').upsert(forward_origin?.chat);
				await setState({ user_id: from.id, state: 'chat_id' });
				await setContest({ contest_id, chat_id, owner: from.id });
				next = true;
			} else if (text.length > 6) {
				await setState({ user_id: from.id, state: 'chat_id' });
				await setContest({ contest_id, chat_id: text, owner: from.id });
				next = true;
			} else {
				await sendMessage(chat.id, `Вы не ввели id канала/группы или ввели его не верно\nПопробуйте еще раз`, {
					inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
				});
			}
			if (next) {
				await sendMessage(
					chat.id,
					`Введи дату окончания проведения конкурса
					\nОбязательно в формате <code>25.03.2024 23:00</code>`,
					{
						inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
					}
				);
			}
		}
		if (state == 'chat_id') {
			// return { statusCode: 200 };
			let finish_date = new Date(text.replace(/(\d+).(\d+).(\d+) (\d+):(\d+)/, '$2.$1.$3 $4:$5')).toISOString();
			if (finish_date) {
				await sendMessage(chat.id, `Введи количество победителей`, {
					inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
				});
				await setState({ user_id: from.id, state: 'finish_date' });
				await setContest({ contest_id, owner: from.id, finish_date });
			} else {
				await sendMessage(
					chat.id,
					`Введи корректно дату окончания проведения конкурса
				\nОбязательно в формате <code>25.03.2024 23:00</code>`,
					{
						inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
					}
				);
			}
		}
		if (state == 'finish_date') {
			await sendMessage(chat.id, `Введи текст для награждения победителей`, {
				inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
			});
			await setState({ user_id: from.id, state: 'winner_count' });
			await setContest({ contest_id, owner: from.id, winner_count: text });
		}
		if (state == 'winner_count') {
			let contest = await setContest({ contest_id, owner: from.id, message_finish: text });
			await sendMessage(
				chat.id,
				`Параметры конкурса:\nНазвание: ${contest.title}\nТекст объявления: ${contest.message_start}
        \LПодведение итогов: ${new Date(contest.finish_date).toLocaleString()}
        \nКоличество победителей: ${contest.winner_count}
        \nСсылка для метки: <code>${contest.id}</code> <i>(можно нажать для копирования)</i>
        \nhttps://t.me/freecontest_bot?start=${contest.id}
      `
			);
			await clearState(from.id);
		}
	}

	return { statusCode: 200 };
};
