const MONTH_DAYS = {
  JANUARY: 31,
  FEBRUARY: 28, // Use 29 for leap years
  MARCH: 31,
  APRIL: 30,
  MAY: 31,
  JUNE: 30,
  JULY: 31,
  AUGUST: 31,
  SEPTEMBER: 30,
  OCTOBER: 31,
  NOVEMBER: 30,
  DECEMBER: 31,
};

// Helper function to check leap year
const isLeapYear = (year) => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

// Get days in a specific month for a given year
const getDaysInMonth = (month, year) => {
  if (month === "FEBRUARY" || month === 1) {
    return isLeapYear(year) ? 29 : 28;
  }
  // For month index (0-11)
  if (typeof month === "number") {
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month === 1 ? (isLeapYear(year) ? 29 : 28) : days[month];
  }
  return MONTH_DAYS[month];
};

// Get number of week-offs (Sundays) in a month
const getWeekOffsInMonth = (month, year) => {
  const daysInMonth = getDaysInMonth(month, year);
  let weekOffs = 0;

  const monthIndex =
    typeof month === "number" ? month : Object.keys(MONTH_DAYS).indexOf(month);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Saturday and Sunday
      weekOffs++;
    }
  }

  return weekOffs;
};

// Get number of specific weekday in a month
const getWeekdayCountInMonth = (month, year, weekday = 0) => {
  // weekday: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
  const daysInMonth = getDaysInMonth(month, year);
  let count = 0;

  const monthIndex =
    typeof month === "number" ? month : Object.keys(MONTH_DAYS).indexOf(month);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    if (date.getDay() === weekday) {
      count++;
    }
  }

  return count;
};

// Get working days in a month (excluding Sundays)
const getWorkingDaysInMonth = (month, year) => {
  const totalDays = getDaysInMonth(month, year);
  const weekOffs = getWeekOffsInMonth(month, year);
  return totalDays - weekOffs;
};

// Get all week-offs dates in a month
const getWeekOffDatesInMonth = (month, year) => {
  const daysInMonth = getDaysInMonth(month, year);
  const weekOffDates = [];

  const monthIndex =
    typeof month === "number" ? month : Object.keys(MONTH_DAYS).indexOf(month);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Saturday and Sunday
      weekOffDates.push(new Date(year, monthIndex, day));
    }
  }

  return weekOffDates;
};

module.exports = {
  MONTH_DAYS,
  isLeapYear,
  getDaysInMonth,
  getWeekOffsInMonth,
  getWeekdayCountInMonth,
  getWorkingDaysInMonth,
  getWeekOffDatesInMonth,
};
