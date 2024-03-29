const client = require('./client');

async function setUser({ id, is_bot, first_name, last_name, username, invite_link }) {
	let { data, error } = await client
		.from('users')
		.upsert({
			user_id: id,
			is_bot,
			first_name,
			last_name,
			username,
			invite_link,
		})
		.select('*')
		.single();

	if (data) return data;
	if (error) return error;
}

async function getAllUsersByStatus(new_status) {
	let { data, error } = await client.from('chat_member').select('*, user_id!inner(*)').in('new_status', new_status);

	if (data) return data;
	if (error) return error;
}

async function getUserById(id) {
	let { data, error } = await client.from('users').select('*').eq('user_id', id).single();
	if (data) return data;
	if (error) return error;
}

module.exports = { setUser, getUserById, getAllUsersByStatus };
