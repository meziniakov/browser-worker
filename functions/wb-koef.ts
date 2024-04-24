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
	data?: string | undefined;
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
	const aboutBot = `🙌 WB Acceptance Bot - это твой помощник по поиску слотов поставок на складах Wildberries.\n\nВы сами выбираете нужный склад > дату поставки > тип поставки и приемлемый уровень коэффициента (или только бесплатные поставки).\n\nWB Acceptance Bot оповестит вас сразу, как только заданные вами условия выполнятся!\n\n🚀 Добавьте новый запрос командой /add`;

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
			console.log('callback_query ', callback_query);
			let { message } = callback_query;
			let { chat, from } = message;
			let user_id = chat.id;

			if (callback_query?.data) {
				let { start, wh_id, delivery_type, delivery_date, coef } = JSON.parse(callback_query?.data);
				let pageSize = 10;

				if (start >= 0) {
					const { data, error } = await client
						.from('warehouses')
						.select('*')
						.limit(10)
						.order('title')
						.range(start, start + pageSize);

					//если массив складов > 0
					if (data.length > 0) {
						let warehouses = data.map((warehouse) => [{ text: warehouse.title, callback_data: JSON.stringify({ wh_id: warehouse.id }) }]);

						//если начало списка складов - оставляем стрелку вперед
						if (start == 0) {
							warehouses.push([{ text: '→', callback_data: JSON.stringify({ start: start + pageSize }) }]);
						} else {
							//если конец списка складов (в массиве меньше 10) - оставляем стрелку назад
							data.length < pageSize - 1
								? warehouses.push([{ text: '←', callback_data: JSON.stringify({ start: start - pageSize }) }])
								: warehouses.push([
										{ text: '←', callback_data: JSON.stringify({ start: start - pageSize }) },
										{ text: '→', callback_data: JSON.stringify({ start: start + pageSize }) },
								  ]);
						}
						await editMessage(chat.id, message.message_id, null, 'Выберите склад', {
							inline_keyboard: warehouses,
						});
					}
				} else if (start <= 0) {
					//TODO: если вдруг начало списка складов меньше 0 - ничего не делаем
				}

				if (wh_id) {
					await editMessage(chat.id, message.message_id, null, 'Введите тип поставки', {
						inline_keyboard: [
							[{ callback_data: JSON.stringify({ delivery_type: 'mono_pallet' }), text: 'Моно-палеты' }],
							[{ callback_data: JSON.stringify({ delivery_type: 'koroba' }), text: 'Короба' }],
							[{ callback_data: JSON.stringify({ delivery_type: 'super_safe' }), text: 'Супер-сейф' }],
						],
					});

					const { data: states, error } = await client.from('states').upsert({ user_id, step: 'wh_id', wh_id });
					console.log('states ', states);
					console.log('error ', error);
				}

				if (delivery_type) {
					let today = new Date();
					let week = today.setDate(today.getDate() + 7);
					let tomorrow = today.setDate(today.getDate() + 1);

					await editMessage(chat.id, message.message_id, null, 'Выберите дату', {
						inline_keyboard: [
							[{ callback_data: JSON.stringify({ delivery_date: new Date().toISOString().split('T')[0] }), text: 'Сегодня' }],
							[{ callback_data: JSON.stringify({ delivery_date: new Date(tomorrow).toISOString().split('T')[0] }), text: 'Завтра' }],
							[{ callback_data: JSON.stringify({ delivery_date: new Date(week).toISOString().split('T')[0] }), text: 'Неделя' }],
						],
					});
					await client.from('states').upsert({ user_id, step: 'delivery_type', delivery_type });
				}

				if (delivery_date) {
					await editMessage(chat.id, message.message_id, null, 'Выберите коээфициент', {
						inline_keyboard: [
							[{ callback_data: JSON.stringify({ coef: 0 }), text: 'Бесплатно' }],
							[
								{ callback_data: JSON.stringify({ coef: 1 }), text: 'х1 и менее' },
								{ callback_data: JSON.stringify({ coef: 2 }), text: 'х2 и менее' },
								{ callback_data: JSON.stringify({ coef: 3 }), text: 'х3 и менее' },
							],
							[
								{ callback_data: JSON.stringify({ coef: 4 }), text: 'х4 и менее' },
								{ callback_data: JSON.stringify({ coef: 5 }), text: 'х5 и менее' },
								{ callback_data: JSON.stringify({ coef: 6 }), text: 'х6 и менее' },
							],
							[
								{ callback_data: JSON.stringify({ coef: 7 }), text: 'х7 и менее' },
								{ callback_data: JSON.stringify({ coef: 8 }), text: 'х8 и менее' },
								{ callback_data: JSON.stringify({ coef: 9 }), text: 'х9 и менее' },
							],
							[{ callback_data: JSON.stringify({ coef: 10 }), text: 'х10 и менее' }],
						],
					});

					await client.from('states').upsert({ user_id, step: 'delivery_date', delivery_date });
				}

				if (coef) {
					const {
						data: { wh_id, delivery_date, delivery_type },
					} = await client.from('states').select('*').eq('user_id', user_id).single();

					const { data: request, error } = await client
						.from('requests')
						.insert({
							user_id,
							is_active: true,
							wh_id,
							delivery_date,
							delivery_type,
							coef,
						})
						.select('*, warehouses (id, title)')
						.single();

					await editMessage(
						user_id,
						message.message_id,
						null,
						`Ваш запрос принят\n<b>Выбранный склад: </b>${request.warehouses.title} (${request.wh_id})\n<b>Дата поставки: </b> ${request.delivery_date}\n<b>Тип поставки: </b> ${request.delivery_type}\n<b>Требуемый коэффициент: </b>${coef}`
					);

					await client.from('states').update({ step: null }).eq('user_id', user_id).select();
				}
			}
		}

		if (message) {
			// console.log('message ', message);
			const { chat, text, from } = message;
			const { data: user } = await client.from('users').select('*').eq('id', chat.id).single();

			if (text === '/add') {
				if (user) {
					const { data, error } = await client.from('warehouses').select('*').limit(10).order('title').range(0, 10);

					let warehouses = data.map((warehouse) => [{ text: warehouse.title, callback_data: JSON.stringify({ wh_id: warehouse.id }) }]);
					warehouses.push([{ text: '→', callback_data: JSON.stringify({ start: 10 }) }]);

					await sendMessage(chat.id, 'Выберите склад', {
						inline_keyboard: warehouses,
					});
				} else {
					await sendMessage(chat.id, `Вы не зарегистрированы. Введите команду /start`);
				}
			}

			if (text === '/test') {
				// console.log('expiredRequests', expiredRequests);
			}

			if (text === '/mylimits') {
				const { data: requests, error } = await client
					.from('requests')
					.select('*, warehouses (title), coefficients (title), delivery_types (title)')
					.eq('is_active', true)
					.eq('user_id', chat.id);

				let result = requests.map(
					(i, n) =>
						`🟢 ${n + 1}. › ${i.warehouses.title} › ${i.delivery_types.title} › ${i.coefficients.title} › ${new Date(
							i.delivery_date
						).toLocaleDateString()}\n`
				);

				if (requests.length > 0) {
					await sendMessage(chat.id, `🔎 Мои запросы (активные)\n${result.join('\n')}`);
				} else {
					await sendMessage(chat.id, 'У вас пока нет ни одного запроса. Отправьте команду /add для добавления нового запроса');
				}
			}

			if (text === '/start') {
				const { data: user, error } = await client.from('users').upsert(chat).select().single();
				console.log('user: ', user);
				console.log('error: ', error);
				if (user) {
					await sendMessage(chat.id, aboutBot);
					await sendMessage(305905070, `Новая регистрация бота:\n${user.id}\n${user.username}\n${user.first_name}\n${user.last_name}`);
				}
			}
		}

		return { statusCode: 200, body: JSON.stringify({ message: 'Ok' }) };
	} catch (e) {
		console.log('Error: ', e);
		return { statusCode: 200, body: JSON.stringify({ message: 'Произошла какая-то ошибка' }) };
	}
};
