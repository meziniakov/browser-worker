const browserInstance = require('./browser');
const booksScrape = require('./booksScrape');

async function pageInstance(url) {
	let browser = await browserInstance();
	let result;
	try {
		const logWarning = (message) => console.error(message);

		browser.once('disconnected', () => logWarning(`Browser has closed or crashed and we've been disconnected!`));

		const page = await browser.newPage();

		await page.setUserAgent(
			'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
		);
		await page.setViewport({ width: 375, height: 812 });

		page.on('pageerror', (err) => {
			logWarning(`Page error emitted: "${err.message}"`);
		});

		page.on('response', (res) => {
			if (!res.ok()) {
				console.error(`Non-200 response from this request: ___"`);
			}
		});

		await page.goto(url, {
			waitUntil: 'domcontentloaded',
		});

		await page.waitForSelector('title');

		result = await booksScrape(page);

		await browser.close();
		return;
	} catch (err) {
		console.warn(`Page error emitted: "${err.message}"`);
		// await sendMessage(chat.id, `К сожалению, произошла ошибка:\n${err.message}`);
	} finally {
		browser.close();
		return result;
	}
}
module.exports = pageInstance;
