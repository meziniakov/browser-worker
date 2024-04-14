const getMe = async () => {
	const apiUrl = `https://api.telegram.org/bot${process.env.WB_ACCEPTANCE_RATE_API_BOT}/getMe`;
	const response = await fetch(apiUrl, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});
	const data = await response.json();
	return data;
};
module.exports = getMe;
