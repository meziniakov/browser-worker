const client = require('./client');

async function addPriceByUrl(url_id, price) {
	let { data, error } = await client
		.from('prices')
		.insert({
			url_id,
			price: parseFloat(price.substr(0, price.length - 1).replace(/\s/g, '')),
		})
		.select('*')
		.single();

	if (data) return data;
	if (error) return error;
}

module.exports = addPriceByUrl;
