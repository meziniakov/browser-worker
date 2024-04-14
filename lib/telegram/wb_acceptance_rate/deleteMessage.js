async function deleteMessage(chatId, messageId) {
	const apiUrl = `https://api.telegram.org/bot${process.env.WB_ACCEPTANCE_API_BOT}/deleteMessage`;
	const res = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			chat_id: chatId,
			message_id: messageId,
		}),
	});
	const data = await res.json();
	return data;
}

module.exports = deleteMessage;
