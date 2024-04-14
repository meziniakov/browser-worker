const editMessage = require('../lib/telegram/wb_acceptance_rate/editMessage');
const sendMessage = require('../lib/telegram/wb_acceptance_rate/sendMessage');
const { warehouse } = require('../lib/wb_warehouse');
const client = require('../lib/supabase/wb_acceptance/client');

interface CallBackQuery {
	id: string;
	from: User;
	message?: any; //MaybeInaccessibleMessage;
	inline_message_id?: string;
	chat_instance?: string;
	data?: string;
	game_short_name: string;
}

type User = {
	id: BigInteger;
	is_bot: Boolean;
	first_name: string;
	last_name?: string;
	username?: string;
	language_code?: string;
	is_premium?: any;
	added_to_attachment_menu?: any;
	can_join_groups?: Boolean;
	can_read_all_group_messages?: Boolean;
	supports_inline_queries?: Boolean;
	can_connect_to_business?: Boolean;
};

exports.handler = async function (event, ctx) {
	try {
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
		}: {
			callback_query: CallBackQuery;
			message: any;
			edited_message: any;
			channel_post: any;
			message_reaction: any;
			pre_checkout_query: any;
			chat_member: any;
			my_chat_member: any;
			chat_join_request: any;
		} = JSON.parse(event.body);

		//обработка callback кнопок
		if (callback_query) {
			let user_id = callback_query.from.id;
			const { data: state, error: er } = await client.from('states').select('*').eq('user_id', user_id).single();

			if (state.step === 'wh_id') {
				const { data, error } = await client
					.from('requests')
					.upsert({
						id: state.req_id,
						user_id,
						is_active: false,
						wh_id: callback_query.data,
					})
					.select()
					.single();

				let deliveryTypeMessage = await editMessage(user_id, state.message_id, null, 'Введите тип поставки', {
					inline_keyboard: [
						[{ callback_data: 'mono_pallet', text: 'Моно-палеты' }],
						[{ callback_data: 'koroba', text: 'Короба' }],
						[{ callback_data: 'super_safe', text: 'Супер-сейф' }],
					],
				});
				await client.from('states').upsert({ user_id, step: 'delivery_type', message_id: deliveryTypeMessage.result.message_id });
			}

			if (state.step === 'delivery_type') {
				const { data, error } = await client
					.from('requests')
					.upsert({
						id: state.req_id,
						user_id,
						is_active: false,
						delivery_type: callback_query.data,
					})
					.select()
					.single();
				let deliveryDateMessage = await editMessage(user_id, state.message_id, null, 'Введите дату', {
					inline_keyboard: [
						[{ callback_data: '2024-04-14', text: '14-04-2024' }],
						[{ callback_data: '2024-04-15', text: '15-04-2024' }],
						[{ callback_data: '2024-04-16', text: '16-04-2024' }],
					],
				});
				await client.from('states').upsert({ user_id, step: 'delivery_date', message_id: deliveryDateMessage.result.message_id });
			}

			if (state.step === 'delivery_date') {
				const { data: request, error } = await client
					.from('requests')
					.upsert({
						id: state.req_id,
						user_id,
						is_active: true,
						delivery_date: callback_query.data,
					})
					.select()
					.single();
				let resultMessage = await editMessage(
					user_id,
					state.message_id,
					null,
					`Ваш запрос принят\n<b>Выбранный склад:</b> ${request.wh_id}\n<b>Дата поставки:</b> ${request.delivery_date}\n<b>Тип поставки:</b> ${request.delivery_type}`
				);
				await client.from('states').upsert({ user_id, step: 'result', message_id: resultMessage.result.message_id });
			}
		}

		if (message) {
			const { chat, text, from } = message;
			const { data: user } = await client.from('users').select('*').eq('message_id', chat.id).single();

			if (text === '/add') {
				let start = await sendMessage(chat.id, 'Введи id склада', {
					inline_keyboard: [
						[
							{ callback_data: `211644`, text: 'СЦ Екатеринбург 2 (Альпинистов)' },
							{ callback_data: `144154`, text: 'СЦ Симферополь' },
						],
						[
							{ callback_data: `207803`, text: 'СЦ Смоленск 2' },
							{ callback_data: `205104`, text: 'СЦ Ульяновск' },
						],
					],
				});
				const { data: request } = await client
					.from('requests')
					.upsert({
						user_id: chat.id,
						is_active: false,
					})
					.select()
					.single();

				const { data, error } = await client
					.from('states')
					.upsert({ req_id: request.id, user_id: chat.id, step: 'wh_id', message_id: start.result.message_id });
			}

			if (text === '/start') {
				const { data: user, error } = await client.from('users').upsert(chat).select().single();
				if (user) {
					await sendMessage(chat.id, `Привет ${user.username}`);
				}
			}

			// if (request?.wh_id == 'null') {
			// 	console.log('request.wh_id ', request.wh_id);
			// 	const { data, error } = await client.from('requests').update({ wh_id: text }).select().single();
			// 	if (data) {
			// 		await sendMessage(chat.id, 'Введите дату');
			// 	} else {
			// 		await sendMessage(chat.id, 'id не соответствует складу');
			// 	}
			// }

			if (text == '/test') {
				const supabase = await client;

				console.log(
					'warehouse ',
					warehouse.map((i, n) => {
						if (n < 10) {
							return [{ text: i[0].title, callback_data: i[0].id, n }];
						} else {
							return;
						}
					})
				);
				await sendMessage(chat.id, 'Привет', {
					inline_keyboard: warehouse.map((i, n) => {
						if (n < 10) {
							return [{ text: i[0].title, callback_data: i[0].id }];
						}
					}),
					// [
					// 	[
					// 		{ callback_data: 211644, text: 'СЦ Екатеринбург 2 (Альпинистов)' },
					// 		{ callback_data: 144154, text: 'СЦ Симферополь' },
					// 	],
					// 	[
					// 		{ text: 'Кнопка', callback_data: 'id123' },
					// 		{ text: 'Кнопка5', callback_data: 'id12345' },
					// 	],
					// 	[{ text: 'Кнопка2', callback_data: 'id1234' }],
					// 	[{ text: 'Кнопка2', callback_data: 'id1234' }],
					// ],
				});
				// console.log(text);
				return { statusCode: 200, body: JSON.stringify({ message: 'Ok' }) };
			}
		}

		return { statusCode: 200, body: JSON.stringify({ message: 'Ok' }) };
	} catch (e) {
		console.log('Error: ', e);
		return { statusCode: 200, body: JSON.stringify({ message: 'Произошла какая-то ошибка' }) };
	}
};
