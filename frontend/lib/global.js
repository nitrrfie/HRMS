export const MONTH_DAYS = {
  JANUARY: 31,
  FEBRUARY: 28,
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

export const isLeapYear = (year) => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

export const getDaysInMonth = (month, year) => {
  if (month === "FEBRUARY" || month === 1) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (typeof month === "number") {
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month === 1 ? (isLeapYear(year) ? 29 : 28) : days[month];
  }
  return MONTH_DAYS[month];
};

export const getWeekOffsInMonth = (month, year) => {
  const daysInMonth = getDaysInMonth(month, year);
  let weekOffs = 0;

  const monthIndex =
    typeof month === "number" ? month : Object.keys(MONTH_DAYS).indexOf(month);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekOffs++;
    }
  }

  return weekOffs;
};

export const getWorkingDaysInMonth = (month, year) => {
  const totalDays = getDaysInMonth(month, year);
  const weekOffs = getWeekOffsInMonth(month, year);
  return totalDays - weekOffs;
};

export const getWeekOffDatesInMonth = (month, year) => {
  const daysInMonth = getDaysInMonth(month, year);
  const weekOffDates = [];

  const monthIndex =
    typeof month === "number" ? month : Object.keys(MONTH_DAYS).indexOf(month);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekOffDates.push(new Date(year, monthIndex, day));
    }
  }

  return weekOffDates;
};
