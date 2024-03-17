const client = require('./client');

async function getRequestsByChatId(chat_id) {
	const { data, error } = await client
		.from('requests')
		//*, users!inner(*)
		.select('*, created_by!inner(*)')
		.match('created_by.username', 305905070);
	// .match('created_by', 305905070);
	if (data) return data;
	if (error) return error;
}

module.exports = getRequestsByChatId;
