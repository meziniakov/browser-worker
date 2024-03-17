const client = require('./client');

async function getUrlsActive() {
	const { data, error } = await client.from('requests').select('url_id (id, url)').eq('is_active', true);
	if (data) return data;
	if (error) return error;
}

module.exports = getUrlsActive;
