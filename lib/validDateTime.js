const validDateTime = async (dateStr) => {
	const [date, time] = dateStr.split(' ');
	if (!date || !time) {
		return false;
	}
	const regex = /^\d{2}.\d{2}.\d{4}$/;

	if (date.match(regex) === null) {
		return false;
	}

	const regexTime = /^\d{2}:\d{2}$/;

	if (time.match(regexTime) === null) {
		return false;
	}

	const [day, month, year] = date.split('.');

	// 👇️ format Date string as `yyyy-mm-dd`
	const isoFormattedStr = `${year}-${month}-${day}`;

	const isoDate = new Date(isoFormattedStr);

	const timestamp = isoDate.getTime();

	if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
		return false;
	}

	if (isoDate.toISOString().startsWith(isoFormattedStr)) {
		return new Date(dateStr?.replace(/(\d+).(\d+).(\d+) (\d+):(\d+)/, '$2.$1.$3 $4:$5')).toISOString();
	} else {
		return false;
	}
};
module.exports = validDateTime;
