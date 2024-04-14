const sendMessage = async (chatId, text, reply_markup) => {
	const apiUrl = `https://api.telegram.org/bot${process.env.WB_ACCEPTANCE_RATE_API_BOT}/sendMessage`;
	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: chatId,
			text: text,
			parse_mode: 'HTML',
			reply_markup,
		}),
	});
	const data = await response.json();
	return data;
};
module.exports = sendMessage;
