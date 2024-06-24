const sendMessage = require('../lib/telegram/sendMessage');
const { setState, getState, clearState } = require('../lib/supabase/subscribe/setState');
const { setContest, getContestByUserId, getAllContest, deleteContest, getContest } = require('../lib/supabase/subscribe/setContest');
const chatMemberChange = require('../lib/supabase/subscribe/chatMemberChange');
const setInviteLink = require('../lib/supabase/subscribe/setInviteLink');
const { getUserById, setUser, getAllUsersByStatus } = require('../lib/supabase/subscribe/setUser');
const { getChatMemberByUserId, addChatMember } = require('../lib/supabase/subscribe/addChatMember');
const client = require('../lib/supabase/subscribe/client');
const getMe = require('../lib/telegram/getMe');
const validDateTime = require('../lib/validDateTime');

exports.handler = async function (event, ctx) {
	const { message, callback_query, chat_member, my_chat_member } = JSON.parse(event.body);
	console.log('event.body ', event.body);
	// console.log('my_chat_member ', my_chat_member);

	if (callback_query) {
		// console.log('callback_query ', callback_query);
		let { message, data } = callback_query;
		let { contest_id } = await getState(message.chat.id);
		//прерывая процесс добавления конкурса - удаляем запись и обнуляем стейт
		if (data === '/cancel') {
			await sendMessage(message.chat.id, 'Создание конкурса/розыгрыша прервано');
			await clearState(message.chat.id);
			await deleteContest(contest_id);
			return { statusCode: 200 };
		}
	}

	if (my_chat_member) {
		console.log('my_chat_member ', my_chat_member);
		const { from, chat, new_chat_member } = my_chat_member;
		if (new_chat_member.status === 'administrator') {
			await sendMessage(
				from.id,
				`Введи дату окончания проведения конкурса
				\nОбязательно в формате <code>25.03.2024 23:00</code>`,
				{
					inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
				}
			);
			let { contest_id } = await getState(from.id);
			await client.from('chats').upsert(chat);
			await setContest({ contest_id, chat_id: chat.id, owner: from.id });
			await setState({ user_id: from.id, state: 'chat_id' });
		} else {
			let { result: me } = await getMe();
			await sendMessage(
				chat.id,
				`У бота ${me.username} отсутствуют права администратора на канал ${chat.title}\nДобавьте бота в канал с правами администратора, чтобы управлять конкурсами и розыгрышами!`,
				{
					inline_keyboard: [
						[{ text: 'Выбрать канал/группу', url: `t.me/${me?.username}?startgroup=true` }],
						[{ text: 'Отмена', callback_data: '/cancel' }],
					],
				}
			);
		}
	}

	if (chat_member) {
		let user_id = chat_member?.from.id;
		let chat_id = chat_member?.chat.id;

		let user = await getUserById(user_id);
		let chatMember = await getChatMemberByUserId(user_id, chat_id);
		let chats = await client.from('chats').upsert(chat_member.chat);

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

		if (chat_member?.new_chat_member?.status === 'member' || chat_member?.new_chat_member?.status === 'creator') {
			await sendMessage(
				chat_member?.from.id,
				`${chat_member?.from.first_name} ${chat_member?.from.last_name}, спасибо, мы увидели что вы подписались на канал, желаем победы в конкурсе`
			);
		}
		if (chat_member?.new_chat_member?.status === 'left') {
			await sendMessage(
				chat_member?.from.id,
				`${chat_member?.from.first_name} ${chat_member?.from.last_name}, сожалеем, что вы отписались. Вы не сможете участвовать в конкурсе.`
			);
		}

		return { statusCode: 200 };
	}

	if (message) {
		let { result: me } = await getMe();
		console.log('message ', message);
		const { chat, from, text } = message;
		const isAdmin = process.env.ADMIN_IDS.split(',')
			.map((i) => parseInt(i))
			.includes(from.id);
		let { state, contest_id } = await getState(from.id);

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
						await sendMessage(from.id, `Поздравляем победителей:\n${winner_message.join('\n')}`);
						await sendMessage(
							chat.id,
							`Конкурс "${contest.title}":\n${
								winners.length == 0 ? 'Нет победителей\n' : winners.map((i, _) => `${++_}. ${i.first_name} ${i.last_name}`).join('\n')
							}`
						);

						// winner_message.push(
						// 	`Конкурс "${contes
						// 		winners.length == 0 ? 'Нет победителей\n' : winners.map((i, _) => `${++_}. ${i.first_name} ${i.last_name}`).join('\n')
						// 	}`
						// );
					}
					const { data, error } = await client.from('contest_config').update('status', 'done').eq('id', contest.id);
					console.log('contest done: ', data);
					console.log('contest done error: ', error);
				}
			} else {
				return { statusCode: 200 };
			}

			// await sendMessage(from.id, `Поздравляем победителей:\n${winner_message.join('\n')}`);
		}

		//добавление розыгрыша
		if (text === '/addcontest' && isAdmin) {
			console.log('me ', me);
			await sendMessage(chat.id, `Введи название розыгрыша`, {
				inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
			});
			await setState({ user_id: from.id, state: null });
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
				`Выберите нужный канал или группу, нажав кнопку ниже!
			\nНеобходимо будет назначить бота Администратором с правом писать сообщения
			\nТакже, можно просто переслать сюда любое сообщение из целевого канала`,
				{
					inline_keyboard: [
						[{ text: 'Выбрать канал/группу', url: `t.me/${me?.username}?startgroup=true` }],
						[{ text: 'Отмена', callback_data: '/cancel' }],
					],
				}
			);
			await setState({ user_id: from.id, state: 'message_start' });
			await setContest({ contest_id, owner: from.id, message_start: text });
		}
		if (state == 'message_start') {
			let { forward_origin, new_chat_member, new_chat_members } = message;
			console.log('new_chat_members ', new_chat_members);
			console.log('my_chat_member ', my_chat_member);
			let chat_id = forward_origin ? forward_origin?.chat?.id : chat?.id;
			let next = false;

			if (forward_origin?.chat?.id) {
				console.log('forward_origin ', forward_origin);
				await client.from('chats').upsert(forward_origin?.chat);
				await setContest({ contest_id, chat_id, owner: from.id });
				next = true;
			} else if (my_chat_member?.my_chat_member) {
				console.log('my_chat_member ', my_chat_member.my_chat_member);
				await client.from('chats').upsert(my_chat_member.my_chat_member?.chat);
				await setContest({ contest_id, chat_id: my_chat_member.my_chat_member.chat.id, owner: from.id });
				next = true;
			} else if (new_chat_member) {
				console.log('new_chat_member ', new_chat_member);
				await client.from('chats').upsert(chat);
				await setContest({ contest_id, chat_id, owner: from.id });
				next = true;
			} else if (text?.length > 6) {
				await setContest({ contest_id, chat_id: text, owner: from.id });
				next = true;
			} else {
				await sendMessage(
					chat.id,
					`Вы не ввели id канала/группы или ввели его не верно. Попробуйте еще раз\n\nВыберите нужный канал или группу, нажав кнопку ниже!\nНеобходимо будет назначить бота Администратором с правом писать сообщения\nТакже, можно просто переслать сюда любое сообщение из целевого канала`,
					{
						inline_keyboard: [
							[{ text: 'Выбрать канал/группу', url: `t.me/${me?.username}?startgroup=true` }],
							// [{ text: 'Выбрать чат/группу', url: `tg:resolve?domain=prizrpromobot&startgroup=true` }],
							// [{ text: 'Выбрать чат/группу', url: `https://t.me/${me?.username}?startgroup=true` }],
							// [{ text: 'Выбрать чат/группу', url: `t.me/prizrpromobot?startgroup` }],
							// [{ text: 'Выбрать канал', url: `t.me/prizrpromobot?startchannel&admin=post_messages` }],
							[{ text: 'Отмена', callback_data: '/cancel' }],
						],
					}
				);
			}

			if (next) {
				await setState({ user_id: from.id, state: 'chat_id' });
				await sendMessage(
					from.id,
					`Введи дату окончания проведения конкурса
					\nОбязательно в формате <code>25.03.2024 23:00</code>`,
					{
						inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
					}
				);
			}
		}
		if (state == 'chat_id') {
			let finish_date = await validDateTime(text);
			if (finish_date) {
				await sendMessage(from.id, `Введи количество победителей`, {
					inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
				});
				await setState({ user_id: from.id, state: 'finish_date' });
				await setContest({ contest_id, owner: from.id, finish_date });
			} else {
				await sendMessage(
					from.id,
					`Введи корректно дату окончания проведения конкурса
				\nОбязательно в формате <code>25.03.2024 23:00</code>`,
					{
						inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
					}
				);
			}
		}
		if (state == 'finish_date') {
			await sendMessage(from.id, `Введи текст для награждения победителей`, {
				inline_keyboard: [[{ text: 'Отмена', callback_data: '/cancel' }]],
			});
			await setState({ user_id: from.id, state: 'winner_count' });
			await setContest({ contest_id, owner: from.id, winner_count: text });
		}
		if (state == 'winner_count') {
			let contest = await setContest({ contest_id, owner: from.id, message_finish: text });
			await sendMessage(
				from.id,
				`Параметры конкурса:\nНазвание: ${contest.title}\nТекст объявления: ${contest.message_start}
        \nПодведение итогов: ${new Date(contest.finish_date).toLocaleString()}
        \nКоличество победителей: ${contest.winner_count}
        \nСсылка для метки: <code>https://t.me/${me?.username}?start=${contest.id}</code> <i>(можно нажать для копирования)</i>`
			);
			await clearState(from.id);
		}

		if (text === '/allcontest' && state === null) {
			let contests = await getAllContest();
			await sendMessage(
				me.id,
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
				me.id,
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
	}

	return { statusCode: 200 };
};
