import dateFormat from 'dateformat';

const ZERO_DATE: Date = new Date(0);

// eslint-disable-next-line import/prefer-default-export
export function formatDateStr(date: Date | undefined, format = 'yyyy-mm-dd h:MM TT'): string {
	return date && date > ZERO_DATE ? dateFormat(date, format) : '';
}
