async function booksScrape(page) {
	let data = {};

	data.title = await page.title();
	// await page.waitFor(500);

	// await page.screenshot({ path: 'ozon.png' });
	data.description = await page.$eval('meta[name="description"]', (element) => element.content);
	data.price = await page.$eval('.price_color', (el) => el.innerText.trim().slice(1));
	// productTitle = await page.$eval('.product-page__title', (element) => element.innerText.trim());
	// productImg = await page.$eval('.zoom-image-container > img', (element) => element.src);

	// const soldOut = await page.$eval('.product-page__price-block', (element) =>
	// 	element.querySelector('.sold-out-product__text') ? element.querySelector('.sold-out-product__text')?.innerText : ''
	// );

	// finalPrice = await page.$eval('.product-page__price-block', (element) =>
	// 	element.querySelector('.price-block__final-price') ? element.querySelector('.price-block__final-price').innerText : ''
	// );

	// const oldPrice = await page.$eval('.product-page__price-block', (element) =>
	// 	element.querySelector('.price-block__old-price') ? element.querySelector('.price-block__old-price').innerText : ''
	// );
	return data;
}
module.exports = booksScrape;
