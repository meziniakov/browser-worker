const getMe = async () => {
	const apiUrl = `https://api.telegram.org/bot${process.env.API_KEY}/getMe`;
	const response = await fetch(apiUrl, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});
	const data = await response.json();
	return data;
};
module.exports = getMe;
