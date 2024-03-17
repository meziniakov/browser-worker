const sendMessage = require('../lib/telegram/sendMessage');
const deleteMessage = require('../lib/telegram/deleteMessage');
const answerPreCheckoutQuery = require('../lib/telegram/answerPreCheckoutQuery');
const client = require('../lib/supabase/subscribe/client');
const { setUser } = require('../lib/supabase/subscribe/setUser');
const chatMemberChange = require('../lib/supabase/subscribe/chatMemberChange');
const addChatMember = require('../lib/supabase/subscribe/addChatMember');

exports.handler = async function (event, ctx) {
	// const { data, error } = await client.from('user').select('id');
	// const newUser = await setUser({
	// 	id: 305905070,
	// 	is_bot: false,
	// 	first_name: 'Mezin',
	// 	last_name: 'Yakov',
	// 	username: 'yakovmezin',
	// });

	// const data = await addChatMember({ id: 305905070, old_status: 'left', new_status: 'member' });

	// const data = await chatMemberChange({ user_id: 982423117, old_status: 'member', new_status: 'left' });

	// return {
	// 	statusCode: 200,
	// 	headers: {
	// 		'Content-Type': 'application/json',
	// 	},
	// 	body: JSON.stringify({ message: 'ok', data }),
	// };

	// console.log(JSON.parse(event.body));
	// return;

	const { message, edited_message, channel_post, message_reaction, pre_checkout_query, chat_member, my_chat_member, chat_join_request } =
		JSON.parse(event.body);
	// console.log(JSON.parse(event.body));

	if (
		message ||
		edited_message ||
		channel_post ||
		message_reaction ||
		pre_checkout_query ||
		chat_member ||
		my_chat_member ||
		chat_join_request
	) {
		// console.log('message ', message);
		// console.log('edited_message ', edited_message);
		// console.log('message_reaction ', message_reaction);
		// console.log('channel_post ', channel_post);
		// console.log('pre_checkout_query ', pre_checkout_query);

		const chatMember = await chatMemberChange({
			user_id: chat_member?.from.id,
			old_status: chat_member?.old_chat_member?.status,
			new_status: chat_member?.new_chat_member?.status,
			invite_link: chat_member?.invite_link?.invite_link,
		});

		// console.log('chat_member ', chat_member);
		console.log(chat_member?.invite_link?.invite_link);
		// console.log('my_chat_member ', my_chat_member);
		// console.log('chat_join_request ', chat_join_request);
		// let answer = await answerPreCheckoutQuery(pre_checkout_query.id, true, null);

		let sendMessage_;
		if (chat_member?.new_chat_member?.status !== 'left' || chat_member?.new_chat_member?.status !== 'kicked') {
			sendMessage_ = await sendMessage(chat_member?.chat.id, `Привет ${chat_member?.from.first_name}\n${chat_member?.from.last_name}`);
		}

		// else {
		// 	// await deleteMessage(chat_member.chat.id, sendMessage_.result.message_id);
		// }

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ message: 'ok', chatMember }),
		};

		// await sendMessage(newDeposit.chat_id, `Ваш счет пополнен и составляет:\n${newDeposit.deposit / 10} запросов (1 запрос = 10 руб)`);
	}

	if (message) {
		const chat = message.chat;
		const text = message.text;
		if (text === '/browser') {
			let page = await pageInstance('http://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html');
			console.log('page title', page);
		}
		if (text === '/deposit') {
			let requests = await getRequestsByChatId(305905070);

			let deposit = await getDepositByUsername(chat.username);
			await sendMessage(
				chat.id,
				`${!deposit.message ? `Ваш депозит составляет:\n${deposit / 10} запросов (1 запрос = 10 руб)` : deposit.message}`
			);
			return {
				statusCode: 200,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ deposit }),
			};
		}
		if (text === '/in') {
			//invoice
			let invoice = await sendInvoice(
				chat.id,
				'Подписка на бота',
				'Активация подписки на бота на 1 месяц',
				process.env.PAYMENTS_TOKEN,
				'test-invoice-payload',
				'RUB',
				[{ label: 'Подписка на 1 месяц', amount: 10000 }]
			);

			console.log('invoice ', invoice);
		}
	}

	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ message: 'Okey' }),
	};
};
