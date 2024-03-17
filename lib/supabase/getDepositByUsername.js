const client = require('./client');

async function getDepositByUsername(username) {
	const { data, error } = await client.from('users').select('deposit').match({ username }).select().single();
	if (data) return data.deposit;
	if (error) return error;
}

module.exports = getDepositByUsername;
