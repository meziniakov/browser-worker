const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

async function browserInstance() {
	browser = await puppeteer.launch({
		args: chromium.args,
		ignoreDefaultArgs: ['--disable-extensions'],
		executablePath: process.env.CHROME_EXECUTABLE_PATH,
		// headless: true,
		headless: chromium.headless,
		timeout: 100000,
	});
	return browser;
}
module.exports = browserInstance;
