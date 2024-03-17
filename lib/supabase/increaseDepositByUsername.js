const client = require('./client');

async function increaseDepositByUsername(username, deposit, total_amount) {
	const { data } = await client
		.from('users')
		.update({ deposit: deposit + total_amount })
		.match({ username })
		.select()
		.single();
	if (data) return data.deposit;
	if (error) return error;
}

module.exports = increaseDepositByUsername;
