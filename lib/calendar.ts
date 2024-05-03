interface CalendarProps {
	year: number;
	month: number;
}

function range(count) {
	let arr: number[] = [];
	for (let n = 1; n <= count; n++) {
		arr.push(n);
	}
	return arr;
}

//последний день месяца
function getLastDay(year, month) {
	return new Date(year, month, 0).getDate();
}

function getFirstWeekDay(year, month) {
	return new Date(year, month - 1, 1).getDay();
}
//последний день недели месяца
function getLastWeekDay(year, month) {
	return new Date(year, month, 0).getDay();
}

let year = 2024;
let month = 2;

function normalize(arr, left, right) {
	for (let i = 1; i < left; i++) {
		arr.unshift(' ');
	}
	for (let n = 0; n <= right; n++) {
		arr.push(' ');
	}
	return arr;
}
function chunk(arr, n, year, month) {
	let result: number[] | String[] = [];
	let count = Math.ceil(arr.length / n);
	let todayDay = new Date().getDate();
	for (let i = 0; i < count; i++) {
		let elems = arr.splice(0, n);
		result.push(
			elems.map((i) => {
				if (todayDay == i) {
					return { text: `(${i})`, callback_data: JSON.stringify({ year, month, day: i }) };
				} else {
					return { text: i, callback_data: JSON.stringify({ year, month, day: i }) };
				}
			})
		);
	}
	return result;
}

const calendar = (year: number, month: number) => {
	let arr = range(getLastDay(year, month));
	let firstWeekDay = getFirstWeekDay(year, month);
	let lastWeekDay = getLastWeekDay(year, month);

	let res = chunk(normalize(arr, firstWeekDay, 6 - lastWeekDay), 7, year, month);
	return res;
	console.log(res);
};

module.exports = calendar;
