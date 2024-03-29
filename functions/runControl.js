const sendMessage = require('../lib/telegram/sendMessage');
const { setState, getState, clearState } = require('../lib/supabase/subscribe/setState');
const { setContest, getContestByUserId, getAllContest, deleteContest } = require('../lib/supabase/subscribe/setContest');
const chatMemberChange = require('../lib/supabase/subscribe/chatMemberChange');
const setInviteLink = require('../lib/supabase/subscribe/setInviteLink');
const { getUserById, setUser, getAllUsersByStatus } = require('../lib/supabase/subscribe/setUser');
const { getChatMemberByUserId, addChatMember } = require('../lib/supabase/subscribe/addChatMember');
const client = require('../lib/supabase/subscribe/client');

exports.handler = async function (event, ctx) {
	const { message, edited_message, channel_post, message_reaction, pre_checkout_query, chat_member, my_chat_member, chat_join_request } =
		JSON.parse(event.body);

	if (chat_member) {
		let user_id = chat_member?.from.id;
		let chat_id = chat_member?.chat.id;

		let user = await getUserById(user_id);
		let chatMember = await getChatMemberByUserId(user_id, chat_id);
		console.log('user ', user);
		let chats = await client.from('chats').upsert(chat_member.chat);
		console.log('chat_member ', chat_member);
		console.log('chats ', chats);
		//-1002100600158
		//-1002056993095

		if (!chatMember.message) {
			chatMember = await chatMemberChange({
				user_id,
				old_status: chat_member?.old_chat_member?.status,
				new_status: chat_member?.new_chat_member?.status,
				invite_link: user?.invite_link,
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

		// console.log(chatMember);
		// console.log('chat_member ', chat_member);

		let sendMessage_;
		if (chat_member?.new_chat_member?.status !== 'left' || chat_member?.new_chat_member?.status !== 'kicked') {
			sendMessage_ = await sendMessage(chat_member?.chat.id, `Привет ${chat_member?.from.first_name}\n${chat_member?.from.last_name}`);
		}

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ message: 'ok', chatMember }),
		};
	}

	if (message) {
		const { chat, from, text } = message;

		// console.log('from ', from);
		// return;
		let { state, contest_id } = await getState(from.id);

		if (text == '/runtest') {
			//1. Запускаем скрипт каждые 3 минуты (ставим в крон задание)
			//2. Скрипт запрашивает конкурсы, в которых статус pending и start_date > now() (func get_start_all_date)
			//3. Если массив конкурсов не пустой - запрашиваем в цикле chat_member со статусом member и выбираем рандомно winner_count

			// const { data, error } = await client.from('contest_config').select('*, chat_member (id, new_status)');
			// console.log('data ', data);

			// return { statusCode: 200 };

			//return start_day[]
			const { data: start_date_array, error: startDateArrayError } = await client
				.rpc('get_start_all_date')
				.select('title, status, winner_count, chat_id')
				.eq('status', 'pending');

			let winner_message = [];

			//3. Если массив конкурсов не пустой - проходим в цикле по конкурсам и последовательно запрашиваем chat_member со статусом member и выбираем рандомно winner_count
			if (start_date_array.length > 0) {
				// console.log('start_date_array ', start_date_array);

				for await (const contest of start_date_array) {
					//return user_id[]
					const { data: winner, error: winnerError } = await client
						.from('chat_member')
						.select('new_status')
						.eq('new_status', 'member')
						.eq('chat_id', contest.chat_id)
						.select('user_id');

					//return users[]
					const { data: users, error: usersError } = await client
						.from('users')
						.select('*')
						.in(
							'user_id',
							winner.map((i) => i.user_id)
						);
					console.log('users ', users);

					winner_message.push(
						`Конкурс "${contest.title}":\n${
							users.length == 0 ? 'Нет победителей\n' : users.map((i, _) => `${++_}. ${i.first_name} ${i.last_name}\n`).join('\n')
						}`
					);
				}
			} else {
				return { statusCode: 200 };
			}
			console.log('winner_message ', winner_message);
			// console.log('поздравление', `Поздравляем победителей:\n${winner_message.join('\n')}`);

			await sendMessage(chat.id, `Поздравляем победителей:\n${winner_message.join('\n')}`);

			return { statusCode: 201 };

			//return user_id[]
			const { data: winner, error: winnerError } = await client
				.from('chat_member')
				.select('new_status')
				.eq('new_status', 'left')
				.select('user_id');

			console.log('winner ', winner);

			//return users[]
			const { data: users, error: usersError } = await client
				.from('users')
				.select('*')
				.in(
					'user_id',
					winner.map((i) => i.user_id)
				);

			console.log('users ', users);
			// console.log('error ', error);

			await sendMessage(chat.id, `Сработало`);
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

		//прерывая процесс добавления конкурса - удаляем запись и обнуляем стейт
		if (text === '/cancel') {
			await clearState(from.id);
			await deleteContest(contest_id);
			return { statusCode: 200 };
		}
	}

	return { statusCode: 200 };
};
