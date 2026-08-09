const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

function getToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}

function formatDate(date) {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return date;
}

module.exports = { getToday, formatDate };
