/**
 * Return the date as "YYYY-MM-DD"
 * @param {Date} dateT 
 */
function formatFullDate(dateT?: Date) {
    if(!dateT) {
        dateT = new Date();
    }

    const offset = dateT.getTimezoneOffset()
    dateT = new Date(dateT.getTime() - (offset*60*1000))
    return dateT.toISOString().split('T')[0]
}


/**
 * Return the date as "YYYY-MM"
 * @param {Date} dateT 
 */
function formatYearMonth(dateT?: Date) {
    if(!dateT) {
        dateT = new Date();
    }

    const fullD = formatFullDate(dateT);

    return fullD.substring(0,7);
}

/**
 * Return the timestamp without TZ
 * If it's 14h in France, return like if it's 14h in GMT (for Dolibarr..)
 * @param {Date} dateT 
 */
function timeUTC(dateT?: Date) {
    if(!dateT) {
        dateT = new Date();
    }

    const offset = dateT.getTimezoneOffset()
    dateT = new Date(dateT.getTime() - (offset*60*1000))
    return parseInt(""+dateT.getTime() / 1000, 10);
}

export default {
    formatFullDate,
    formatYearMonth,
    timeUTC
};
