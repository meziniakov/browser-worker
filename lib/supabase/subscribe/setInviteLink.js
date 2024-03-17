const client = require('./client');

async function setInviteLink({ user_id, invite_link }) {
	let { data, error } = await client
		.from('users')
		.update({
			invite_link,
		})
		.eq('user_id', user_id)
		.select('*')
		.single();

	if (data) return data;
	if (error) return error;
}

module.exports = setInviteLink;
