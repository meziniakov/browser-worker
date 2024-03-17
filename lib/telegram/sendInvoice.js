const sendInvoice = async (chatId, title, description, provider_token, payload, currency, prices, is_flexible) => {
	const apiUrl = `https://api.telegram.org/bot${process.env.API_KEY}/sendInvoice`;
	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: chatId,
			title,
			description,
			provider_token,
			payload,
			currency,
			prices,
			is_flexible,
		}),
	});
	const data = await response.json();
	return data;
};
module.exports = sendInvoice;
