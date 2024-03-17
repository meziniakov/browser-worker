const client = require('./client');

async function chatMemberChange({ user_id, old_status, new_status, invite_link }) {
	let date = new Date();
	let { data, error } = await client
		.from('chat_member')
		.update({ old_status, new_status, changed_at: date.toISOString(), invite_link })
		.eq('user_id', user_id)
		.select()
		.single();

	if (data) return data;
	if (error) return error;
}

module.exports = chatMemberChange;
