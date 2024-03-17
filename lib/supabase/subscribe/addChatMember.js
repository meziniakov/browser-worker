const client = require('./client');

async function addChatMember({ user_id, chat_id, old_status, new_status, invite_link }) {
	let { data, error } = await client
		.from('chat_member')
		.insert({ user_id, chat_id, old_status, new_status, invite_link })
		.select('*')
		.single();

	if (data) return data;
	if (error) return error;
}

async function getChatMemberByUserId(user_id, chat_id) {
	let { data, error } = await client.from('chat_member').select().eq('user_id', user_id).eq('chat_id', chat_id).single();

	if (data) return data;
	if (error) return error;
}

module.exports = { addChatMember, getChatMemberByUserId };
