const answerPreCheckoutQuery = async (pre_checkout_query_id, ok, error_message) => {
	const apiUrl = `https://api.telegram.org/bot${process.env.WB_ACCEPTANCE_RATE_API_BOT}/answerPreCheckoutQuery`;
	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			pre_checkout_query_id,
			ok,
			error_message,
		}),
	});
	const data = await response.json();
	return data;
};
module.exports = answerPreCheckoutQuery;
