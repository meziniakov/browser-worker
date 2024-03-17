exports.handler = async function (event, ctx) {
	const { message, my_chat_member, callback_query } = JSON.parse(event?.body);
	const method = event?.httpMethod;
	// console.log('method', method)
	// console.log('event.body', JSON.parse(event.body))

	if (my_chat_member) {
		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'An update has been received' }),
		};
	}

	//обработка callback запроса от кнопки inline
	if (callback_query) {
		// console.log(callback_query);
		if (callback_query.data.split(',')[1] === 'MSP_REPORT') {
			await sendDocument(callback_query.from.id, callback_query.data.split(',')[0], 'MSP_REPORT');
		}
		if (callback_query.data.split(',')[1] === 'EGRUL_FNS') {
			await sendDocument(callback_query.from.id, callback_query.data.split(',')[0], 'EGRUL_FNS');
		}
		if (callback_query.data.split(',')[1] === 'EGRUL_REPORT') {
			await sendDocument(callback_query.from.id, callback_query.data.split(',')[0], 'EGRUL_REPORT');
		}
		if (callback_query.data.split(',')[1] === 'NOT_BANED_FNS') {
			await fetch(`https://datanewton.ru/api/v2/counterparty/${callback_query.data.split(',')[0]}/report?type=NOT_BANED_FNS`)
				.then((res) => res.json())
				.then(async (data) => {
					console.log('data: ', data);
					if (data.error) {
						await sendMessage(callback_query.from.id, data.error.message);
					} else {
						await sendDocument(callback_query.from.id, callback_query.data.split(',')[0], 'NOT_BANED_FNS');
					}
				})
				.catch((error) => {
					console.log('error: ', error);
				});
		}

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'An callback_query has been received' }),
		};
	}

	if (method === 'POST') {
		if (message.text && message.chat) {
			// Обработка обновления
			await processUpdate(message);

			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'All right' }),
			};
		} else {
			await sendMessage(process.env.CHAT_ID, 'Пришел не корректный запрос - нет свойства message.');
			return {
				statusCode: 404,
				body: JSON.stringify({ message: 'The request recieved not correctly' }),
			};
		}
	} else {
		await sendMessage(process.env.CHAT_ID, `Пришел ${method} запрос (ожидался POST).`);
		return {
			statusCode: 404,
			body: JSON.stringify({ message: 'Request method not correctly' }),
		};
	}

	async function processUpdate(message) {
		// Получение информации из обновления
		const { text, chat } = message;

		// Обработка команд
		if (text === '/start') {
			await sendMessage(chat.id, 'Привет! 🖐️ \nЯ Telegram-бот проверки контрагентов по ИНН или ОГРН.');
		} else if (text === '/help') {
			await sendMessage(chat.id, 'Это бот для проверки контрагентов по ИНН или ОГРН');
		} else if (text.length == 10 || text.length == 12) {
			const { dataArray, ogrn } = await getCompanyData(text);
			// console.log('dataArray ', dataArray)
			await sendMessageInlineKeyboard(chat.id, dataArray.join('\n'), ogrn);
			// await sendMessage(chat.id, companyData);
		} else if (text.length == 13) {
			const { dataArray, ogrn } = await getCompanyData(false, text);
			console.log('ogrn ', ogrn);
			console.log('dataArray ', dataArray);
			await sendMessageInlineKeyboard(chat.id, dataArray.join('\n'), ogrn);
		} else {
			await sendMessage(chat.id, '🧐 \n Введите корректный номер ИНН (10/12 символов) или ОГРН (13 символов)');
		}
	}

	async function getCompanyData(INN, OGRN) {
		try {
			let counterpartyUrl = `https://api.datanewton.ru/v1/counterparty?key=${
				process.env.API_DATANEWTON
			}&filters=MANAGER_BLOCK%2CADDRESS_BLOCK%2COKVED_BLOCK&${INN ? 'inn=' + INN : 'ogrn=' + OGRN}`;
			let financeUrl = `https://api.datanewton.ru/v1/finance?key=${process.env.API_DATANEWTON}&${INN ? 'inn=' + INN : 'ogrn=' + OGRN}`;

			let resCounterparty = await fetch(counterpartyUrl);
			let resFinance = await fetch(financeUrl);

			let counterparty = await resCounterparty.json();
			let finance = await resFinance.json();

			// console.log('counterparty: ', counterparty)
			// console.log('finance: ', finance)

			let viruchka = [];
			let profit = [];
			let dataArray = [];
			let ogrn;
			// return data.code + data.message + res.ok

			if (resFinance.ok) {
				if (finance?.fin_results && finance?.fin_results.indicators) {
					for (let [key, value] of Object.entries(finance.fin_results.indicators[0].sum)) {
						viruchka.push(`${key}: ${convertToMoney(value * 1000)}`);
					}
					for (let [key, value] of Object.entries(finance.fin_results.indicators[19].sum)) {
						profit.push(`${key}: ${convertToMoney(value * 1000)}`);
					}
				}
			} else {
				await sendMessage(process.env.CHAT_ID, `Ошибка объекта resFinance: ${resFinance}`);
				console.log(`Ошибка объекта resFinance: ${resFinance}`);
				return;
			}

			if (resCounterparty.ok) {
				ogrn = counterparty.ogrn;
				if (counterparty.company) {
					let dataUL = {
						'Краткое название': '<code>' + counterparty.company.company_names?.short_name + '</code>',
						'Полное название': '<code>' + counterparty.company.company_names?.full_name + '</code>',
						ОГРН: counterparty.ogrn,
						'Дата регистрации': counterparty.company.registration_date,
						'Статус по ЕГРЮЛ': counterparty.company.status?.status_egr,
						'Юр адрес': '<code>' + counterparty.company.address?.line_address + '</code>',
						'Уставный капитал': convertToMoney(counterparty.company.charter_capital),
						'Основная деятельность':
							counterparty.company.okveds?.filter((i) => i.main)[0].code +
							' ' +
							counterparty.company.okveds?.filter((i) => i.main)[0].value,
					};

					//если есть managers - указываем его позицию (должность) и значение
					if (counterparty.company.managers[0]) {
						dataUL[`${counterparty.company.managers[0]?.position}`] =
							counterparty.company?.managers[0]?.fio + ` (${counterparty.company?.managers[0]?.innfl})`;
					}

					//если нет managers, но есть management_company - указываем 'Управляющая компания' и значение
					if (counterparty.company.management_company) {
						dataUL[
							'Управляющая компания'
						] = `${counterparty.company?.management_company?.name} (${counterparty.company?.management_company?.inn})`;
					}

					if (viruchka.length > 0 && profit.length > 0) {
						dataUL['Выручка'] = '\n' + viruchka?.join('\n');
						dataUL['Чистая прибыль'] = '\n' + profit?.join('\n');
					}
					if (Object.keys(dataUL).length > 0) {
						for (let [key, value] of Object.entries(dataUL)) {
							dataArray.push(`${key}: ${value}`);
						}
					}
				} else if (counterparty.individual) {
					let dataIP = {
						ФИО: counterparty.individual.fio,
						'Дата регистрации': counterparty.individual.registration_date,
						'Статус по ЕГРЮЛ': counterparty.individual.status.status_egr,
					};
					for (let [key, value] of Object.entries(dataIP)) {
						dataArray.push(`${key}: ${value}`);
					}
				}
			} else {
				dataArray.push(counterparty.message);
			}
			// console.log('dataArray ', dataArray)
			return { dataArray, ogrn };
		} catch (error) {
			await sendMessage(process.env.CHAT_ID, `Ошибка ${error}`);
			console.log('Ошибка: ', error);
			return;
		}
	}

	function convertToMoney(int) {
		return new Intl.NumberFormat('ru-RU', {
			style: 'currency',
			currency: 'RUB',
		}).format(parseInt(int));
	}

	async function sendMessage(chatId, text) {
		const apiUrl = `https://api.telegram.org/bot${process.env.API_KEY_PROVERKAOGRN}/sendMessage`;
		const payload = {
			chat_id: chatId,
			text: text,
			parse_mode: 'HTML',
		};

		await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		}).then((resp) => resp.json());
	}

	//отправка файлов
	async function sendDocument(chatId, ogrn, typeReport) {
		const apiUrl = `https://api.telegram.org/bot${process.env.API_KEY_PROVERKAOGRN}/sendDocument`;
		const payload = {
			chat_id: chatId,
			document: `https://datanewton.ru/api/v2/counterparty/${ogrn}/report?type=${typeReport}`,
			caption: `Выписка по ОГРН${ogrn}`,
		};
		// console.log('payload ', JSON.stringify(payload));

		await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})
			.then((resp) => resp)
			.catch((er) => console.log(er));
	}

	//отправка с inline-кнопками
	async function sendMessageInlineKeyboard(chatId, text, ogrn) {
		const apiUrl = `https://api.telegram.org/bot${process.env.API_KEY_PROVERKAOGRN}/sendMessage`;
		// console.log('ogrn ', ogrn);
		const payload = {
			chat_id: chatId,
			text: text,
			parse_mode: 'HTML',
			reply_markup: {
				inline_keyboard: [
					[
						{ text: 'Выписка ЕГРЮЛ', callback_data: `${ogrn},EGRUL_FNS` },
						{ text: 'Выписка МСП', callback_data: `${ogrn},MSP_REPORT` },
						// { text: 'Сводный отчет', callback_data: `${ogrn},EGRUL_REPORT` },
					],
					[{ text: 'Справка об отсутствии блокировок', callback_data: `${ogrn},NOT_BANED_FNS` }],
				],
			},
		};
		// console.log('payload ', JSON.stringify(payload));

		await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})
			.then((resp) => resp.json())
			.catch((er) => console.log(er));
	}
};
