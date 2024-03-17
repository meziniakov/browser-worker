const sendMessage = require('../lib/telegram/sendMessage');
const { setState, getState, clearState } = require('../lib/supabase/subscribe/setState');
const { setContest, getContestByUserId, getAllContest, deleteContest } = require('../lib/supabase/subscribe/setContest');
const chatMemberChange = require('../lib/supabase/subscribe/chatMemberChange');
const setInviteLink = require('../lib/supabase/subscribe/setInviteLink');
const { getUserById, setUser, getAllUsersByStatus } = require('../lib/supabase/subscribe/setUser');
const { getChatMemberByUserId, addChatMember } = require('../lib/supabase/subscribe/addChatMember');

exports.handler = async function (event, ctx) {
	const { message, edited_message, channel_post, message_reaction, pre_checkout_query, chat_member, my_chat_member, chat_join_request } =
		JSON.parse(event.body);

	if (chat_member) {
		let user_id = chat_member?.from.id;
		let chat_id = chat_member?.chat.id;

		let user = await getUserById(user_id);
		let chatMember = await getChatMemberByUserId(user_id, chat_id);
		// console.log('user ', user);

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

		if (text.split(' ')[0] === '/start') {
			let user = await setUser(from);
			console.log('user ', user);

			//добавление дип ссылки пользователю по user_id если она есть в запросе
			if (text.split(' ')[1]) {
				let invite_link = await setInviteLink({ user_id: from.id, invite_link: text.split(' ')[1] });
				console.log('invite_link ', invite_link);
			}
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

		//прерывая процесс добавления конкурса - удаляем запись и обнуляем стейт
		if (text === '/cancel') {
			await clearState(from.id);
			await deleteContest(contest_id);
			return { statusCode: 200 };
		}

		//добавление розыгрыша
		if (text === '/addcontest' && state === null) {
			await sendMessage(chat.id, `Введи название розыгрыша\n<i>для прерывания и выхода нажмите /cancel</i>`);
			let { id } = await setContest({ chat_id: chat.id, owner: from.id });
			await setState({ user_id: from.id, state: '1', contest_id: id });
		}
		if (state == 1) {
			await sendMessage(
				chat.id,
				`Введи текст объявления конкурса
      \n<i>для прерывания и выхода нажмите /cancel</i>`
			);
			await setState({ user_id: from.id, state: '2' });
			await setContest({ contest_id, chat_id: chat.id, owner: from.id, title: text });
		}
		if (state == 2) {
			await sendMessage(
				chat.id,
				`Введи дату начала проведения конкурса
      \nОбязательно в формате <code>2024.03.23 19:00</code>
      \n<i>для прерывания и выхода нажмите /cancel</i>`
			);
			await setState({ user_id: from.id, state: '3' });
			await setContest({ contest_id, chat_id: chat.id, owner: from.id, message_start: text });
		}
		if (state == 3) {
			await sendMessage(
				chat.id,
				`Введи дату окончания проведения конкурса
        \nОбязательно в формате <code>2024.03.25 23:00</code>
        \n<i>для прерывания и выхода нажмите /cancel</i>`
			);
			await setState({ user_id: from.id, state: '4' });
			await setContest({ contest_id, chat_id: chat.id, owner: from.id, start_date: text });
		}
		if (state == 4) {
			await sendMessage(chat.id, `Введи количество победителей\n<i>для прерывания и выхода нажмите /cancel</i>`);
			await setState({ user_id: from.id, state: '5' });
			await setContest({ contest_id, chat_id: chat.id, owner: from.id, finish_date: text });
		}
		if (state == 5) {
			await sendMessage(
				chat.id,
				`Введи текст для награждения победителей\n
      <i>для прерывания и выхода нажмите /cancel</i>`
			);
			await setState({ user_id: from.id, state: '6' });
			await setContest({ contest_id, chat_id: chat.id, owner: from.id, winner_count: text });
		}
		if (state == 6) {
			let contest = await setContest({ contest_id, chat_id: chat.id, owner: from.id, message_finish: text });
			await sendMessage(
				chat.id,
				`Параметры конкурса:\nНазвание: ${contest.title}\nТекст объявления: ${contest.message_start}
        \nСроки проведения: ${new Date(contest.start_date).toLocaleString()} - ${new Date(contest.finish_date).toLocaleString()}
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
