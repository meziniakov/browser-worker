const client = require('./client');

async function setState({ user_id, state, contest_id }) {
	let { data, error } = await client
		.from('states')
		.upsert({
			user_id,
			state,
			contest_id,
		})
		.select('*')
		.single();

	if (data) return data;
	if (error) return error;
}

async function getState(user_id) {
	let { data, error } = await client.from('states').select('*').eq('user_id', user_id).single();

	if (data) return data;
	if (error) return error;
}

async function clearState(user_id) {
	let { data, error } = await client.from('states').update({ state: null, contest_id: null }).eq('user_id', user_id).select();

	if (data) return data;
	if (error) return error;
}

module.exports = { setState, getState, clearState };
