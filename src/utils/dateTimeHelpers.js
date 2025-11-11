/**
 * Maps JS getDay() (0=Sunday, 6=Saturday) to a three-letter code.
 * @param {number} dayIndex - The result of new Date().getDay()
 * @returns {string} Three-letter day code (e.g., 'MON')
 */
const mapDayIndexToCode = (dayIndex) => {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[dayIndex];
};

/**
 * Checks if the current time and day fall within the allowed window.
 * @param {object} timeWindow - { startTime: "HH:MM", endTime: "HH:MM", days: ["MON", "TUE"] }
 * @returns {boolean} True if the current time/day is allowed, false otherwise.
 */
export const isWithinTimeWindow = (timeWindow) => {
  const now = new Date();
  const currentDayCode = mapDayIndexToCode(now.getDay());
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMinute] = timeWindow.startTime.split(":").map(Number);
  const [endHour, endMinute] = timeWindow.endTime.split(":").map(Number);

  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;

  // 1. Check if the current day is allowed
  const isDayAllowed = timeWindow.days.includes(currentDayCode);
  if (!isDayAllowed) {
    return false;
  }

  // 2. Check if the current time is within the window
  if (startTimeInMinutes <= endTimeInMinutes) {
    // Simple case: Start and end times are on the same day (e.g., 09:00 - 17:00)
    return (
      currentTimeInMinutes >= startTimeInMinutes &&
      currentTimeInMinutes <= endTimeInMinutes
    );
  } else {
    // Complex case: Window crosses midnight (e.g., 22:00 - 06:00)
    return (
      currentTimeInMinutes >= startTimeInMinutes ||
      currentTimeInMinutes <= endTimeInMinutes
    );
  }
};
