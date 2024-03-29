const client = require('./client');

async function setContest({ contest_id, title, chat_id, owner, winner_count, start_date, finish_date, message_finish, message_start }) {
	if (!contest_id) {
		let { data, error } = await client
			.from('contest_config')
			.upsert({
				title,
				chat_id,
				owner,
				winner_count,
				start_date,
				finish_date,
				message_finish,
				message_start,
			})
			.select('*')
			.single();

		if (data) return data;
		if (error) return error;
	} else {
		let { data, error } = await client
			.from('contest_config')
			.update({ title, chat_id, owner, winner_count, start_date, finish_date, message_finish, message_start })
			.eq('id', contest_id)
			.select()
			.single();

		if (data) return data;
		if (error) return error;

		// if (getContestById.data) return getContestById.data;
	}
}
async function getContest(contest_id) {
	let { data, error } = await client.from('contest_config').select('*').eq('id', contest_id).single().maybeSingle();
	if (data) return data;
	if (error) return error;
}

async function deleteContest(contest_id) {
	let { data, error } = await client.from('contest_config').delete().eq('id', contest_id);

	if (data) return data;
	if (error) return error;
}

async function getAllContest() {
	let { data, error } = await client.from('contest_config').select('*');

	if (data) return data;
	if (error) return error;
}

async function getContestByUserId(user_id) {
	// let { data, error } = await client.from('contest_config').select('* chat_member (user_id)').eq('owner', user_id);
	let { data, error } = await client.from('chat_member').select('*, user_id!inner(*), invite_link!inner(*)').eq('user_id', user_id);
	// let { data, error } = await client
	// 	.from('chat_member')
	// 	.select('*, invite_link!inner(*), user_id!inner(*)')
	// 	.eq('invite_link', invite_link)
	// 	.in('new_status', ['member', 'creator']);

	if (data) return data;
	if (error) return error;
}

module.exports = { setContest, getContest, getContestByUserId, getAllContest, deleteContest };
