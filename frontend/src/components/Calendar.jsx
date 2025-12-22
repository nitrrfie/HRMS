import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import "./Calendar.css";

// List of Gazetted Holidays - You can modify this list as needed
const GAZETTED_HOLIDAYS = [
  "Republic Day",
  "Holi",
  "Eid ul-Fitr",
  "Mahavir Swami Jayanti",
  "Good Friday",
  "Buddha Purnima",
  "Eid ul-Zuha",
  "Muharram",
  "Independence Day",
  "Id-e-Milad",
  "Janmashtami",
  "Hindi Diwas",
  "Gandhi Jayanti",
  "Dussehra",
  "Diwali",
  "Guru Nanak Jayanti",
  "Christmas",
];

const Calendar = () => {
  const { user } = useAuth();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedHolidays, setEditedHolidays] = useState([]);
  const [customHolidays, setCustomHolidays] = useState([]);
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    date: "",
    name: "",
    description: "",
  });

  const isCEO = user?.role === ROLES.CEO;

  // Fetch holidays from API
  useEffect(() => {
    fetchHolidays();
  }, [currentYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://jayantur13.github.io/calendar-bharat/calendar/${currentYear}.json`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch holidays");
      }
      const data = await response.json();

      // Extract holidays from the API response structure
      // Structure: { "2026": { "January 2026": { "January 1, 2026, Thursday": { event, type, extras } } } }
      let allHolidays = [];

      // Get the year data
      const yearData = data[currentYear.toString()];

      if (yearData && typeof yearData === "object") {
        // Iterate through each month
        Object.keys(yearData).forEach((monthKey) => {
          const monthData = yearData[monthKey];

          // Iterate through each date in the month
          Object.keys(monthData).forEach((dateKey) => {
            const holidayData = monthData[dateKey];

            // Parse the date from the key (e.g., "January 1, 2026, Thursday")
            const dateParts = dateKey.split(", ");
            if (dateParts.length >= 2) {
              const dateStr = `${dateParts[0]}, ${dateParts[1]}`; // "January 1, 2026"
              const parsedDate = new Date(dateStr);

              if (!isNaN(parsedDate.getTime())) {
                // Format date as YYYY-MM-DD
                const formattedDate = `${parsedDate.getFullYear()}-${String(
                  parsedDate.getMonth() + 1
                ).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(
                  2,
                  "0"
                )}`;

                allHolidays.push({
                  date: formattedDate,
                  name: holidayData.event,
                  type: holidayData.type,
                  description: holidayData.extras,
                });
              }
            }
          });
        });
      }

      // Filter for gazetted holidays only - show only holidays that match the GAZETTED_HOLIDAYS array
      const gazettedHolidays = allHolidays.filter((holiday) =>
        GAZETTED_HOLIDAYS.some(
          (gh) =>
            holiday.name?.toLowerCase().includes(gh.toLowerCase()) ||
            gh.toLowerCase().includes(holiday.name?.toLowerCase() || "")
        )
      );

      setHolidays(gazettedHolidays);
      setEditedHolidays(gazettedHolidays);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching holidays:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Check if a date is a holiday
  const getHolidayForDate = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    const allHolidays = [...holidays, ...customHolidays];
    return allHolidays.find((h) => h.date === dateStr);
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Edit mode functions (CEO only)
  const handleEditMode = () => {
    setIsEditMode(true);
    setEditedHolidays([...holidays]);
  };

  const handleSaveChanges = () => {
    setHolidays(editedHolidays);
    setIsEditMode(false);
    // Here you would typically save to backend
    console.log("Saved holidays:", editedHolidays);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedHolidays([...holidays]);
  };

  const handleAddCustomHoliday = () => {
    if (newHoliday.date && newHoliday.name) {
      setCustomHolidays([...customHolidays, { ...newHoliday, id: Date.now() }]);
      setNewHoliday({ date: "", name: "", description: "" });
      setShowAddHolidayModal(false);
    }
  };

  const handleRemoveHoliday = (holidayDate) => {
    setCustomHolidays(customHolidays.filter((h) => h.date !== holidayDate));
  };

  // Render calendar grid
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === currentYear && today.getMonth() === currentMonth;

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const holiday = getHolidayForDate(currentYear, currentMonth, day);
      const isToday = isCurrentMonth && today.getDate() === day;
      const isWeekend =
        new Date(currentYear, currentMonth, day).getDay() === 0 ||
        new Date(currentYear, currentMonth, day).getDay() === 6;

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? "today" : ""} ${
            holiday ? "holiday" : ""
          } ${isWeekend ? "weekend" : ""}`}
          title={
            holiday
              ? `${holiday.name}${
                  holiday.description ? ": " + holiday.description : ""
                }`
              : ""
          }
        >
          <div className="day-number">{day}</div>
          {holiday && (
            <div className="holiday-info">
              <div className="holiday-name">{holiday.name}</div>
              {isEditMode && isCEO && (
                <button
                  className="remove-holiday-btn"
                  onClick={() => handleRemoveHoliday(holiday.date)}
                  title="Remove holiday"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-title">
          <CalendarIcon size={24} />
          <h2>Company Calendar - Gazetted Holidays</h2>
        </div>
        <div className="calendar-actions">
          {isCEO && !isEditMode && (
            <button className="btn-edit" onClick={handleEditMode}>
              <Edit2 size={16} />
              Edit Calendar
            </button>
          )}
          {isCEO && isEditMode && (
            <>
              <button className="btn-save" onClick={handleSaveChanges}>
                <Save size={16} />
                Save Changes
              </button>
              <button className="btn-cancel" onClick={handleCancelEdit}>
                <X size={16} />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="calendar-error">
          <p>Error loading holidays: {error}</p>
          <button onClick={fetchHolidays}>Retry</button>
        </div>
      )}

      <div className="calendar-navigation">
        <button className="nav-btn" onClick={goToPreviousMonth}>
          <ChevronLeft size={20} />
        </button>
        <div className="current-month">
          <h3>
            {monthNames[currentMonth]} {currentYear}
          </h3>
        </div>
        <button className="nav-btn" onClick={goToNextMonth}>
          <ChevronRight size={20} />
        </button>
        <button className="btn-today" onClick={goToToday}>
          Today
        </button>
      </div>

      {isEditMode && isCEO && (
        <div className="edit-toolbar">
          <button
            className="btn-add-holiday"
            onClick={() => setShowAddHolidayModal(true)}
          >
            Add Custom Holiday
          </button>
        </div>
      )}

      {loading ? (
        <div className="calendar-loading">Loading holidays...</div>
      ) : (
        <>
          <div className="calendar-weekdays">
            {weekDays.map((day) => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}
          </div>
          <div className="calendar-grid">{renderCalendar()}</div>
        </>
      )}

      {/* Holiday List */}
      <div className="holiday-list">
        <h3>
          Holidays in {monthNames[currentMonth]} {currentYear}
        </h3>
        <div className="holiday-items">
          {[...holidays, ...customHolidays]
            .filter((h) => {
              const hDate = new Date(h.date);
              return (
                hDate.getMonth() === currentMonth &&
                hDate.getFullYear() === currentYear
              );
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((holiday, index) => (
              <div key={index} className="holiday-item">
                <div className="holiday-date">
                  {new Date(holiday.date).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="holiday-details">
                  <div className="holiday-item-name">{holiday.name}</div>
                  {holiday.description && (
                    <div className="holiday-description">
                      {holiday.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          {[...holidays, ...customHolidays].filter((h) => {
            const hDate = new Date(h.date);
            return (
              hDate.getMonth() === currentMonth &&
              hDate.getFullYear() === currentYear
            );
          }).length === 0 && (
            <p className="no-holidays">No holidays this month</p>
          )}
        </div>
      </div>

      {/* Add Holiday Modal */}
      {showAddHolidayModal && isCEO && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddHolidayModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Custom Holiday</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddHolidayModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) =>
                    setNewHoliday({ ...newHoliday, date: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Holiday Name</label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) =>
                    setNewHoliday({ ...newHoliday, name: e.target.value })
                  }
                  placeholder="e.g., Company Foundation Day"
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newHoliday.description}
                  onChange={(e) =>
                    setNewHoliday({
                      ...newHoliday,
                      description: e.target.value,
                    })
                  }
                  placeholder="Additional details about the holiday"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddHolidayModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleAddCustomHoliday}
                disabled={!newHoliday.date || !newHoliday.name}
              >
                Add Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color today-color"></span>
          <span>Today</span>
        </div>
        <div className="legend-item">
          <span className="legend-color holiday-color"></span>
          <span>Holiday</span>
        </div>
        <div className="legend-item">
          <span className="legend-color weekend-color"></span>
          <span>Weekend</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
