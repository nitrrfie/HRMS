import { useState, useEffect } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { attendanceAPI } from "../services/api";
import "./AttendanceRecord.css";
import { hours_attendance, minutes_attendance } from "../services/attendance";

const AttendanceRecord = () => {
  const { user, canAccessFeature } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [subordinates, setSubordinates] = useState([]);
  const [subordinatesLoading, setSubordinatesLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchMyAttendance();
    if (user.role === "OFFICER_IN_CHARGE") {
      fetchSubordinates();
    }
  }, [user.role]);

  const fetchMyAttendance = async () => {
    try {
      const data = await attendanceAPI.getMy(
        currentTime.getMonth() + 1,
        currentTime.getFullYear()
      );
      if (data.success) {
        setAttendanceHistory(data.attendance || []);
        console.log("Attendance data:", data.attendance);
        const nowDate = new Date();
        console.log(
          "Looking for date (UTC):",
          `${nowDate.getUTCFullYear()}-${
            nowDate.getUTCMonth() + 1
          }-${nowDate.getUTCDate()}`
        );

        const today = data.attendance?.find((a) => {
          const attDate = new Date(a.date);
          console.log(
            "Checking attendance date:",
            a.date,
            "parsed as UTC:",
            `${attDate.getUTCFullYear()}-${
              attDate.getUTCMonth() + 1
            }-${attDate.getUTCDate()}`
          );
          // Compare UTC dates
          return (
            attDate.getUTCFullYear() === nowDate.getUTCFullYear() &&
            attDate.getUTCMonth() === nowDate.getUTCMonth() &&
            attDate.getUTCDate() === nowDate.getUTCDate()
          );
        });
        console.log("Found today attendance:", today);
        if (today) {
          setTodayAttendance(today);
          if (today.checkIn?.time) setCheckInTime(new Date(today.checkIn.time));
          if (today.checkOut?.time)
            setCheckOutTime(new Date(today.checkOut.time));
        }
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    }
  };

  const fetchSubordinates = async () => {
    setSubordinatesLoading(true);
    try {
      const data = await attendanceAPI.getSubordinates();
      if (data.success) {
        setSubordinates(data.subordinates || []);
      }
    } catch (error) {
      console.error("Failed to fetch subordinates:", error);
    } finally {
      setSubordinatesLoading(false);
    }
  };

  const handleMarkStatus = async (userId, status) => {
    try {
      const data = await attendanceAPI.markStatus(userId, status);
      if (data.success) {
        // Optimistically update UI
        setSubordinates((prev) =>
          prev.map((sub) =>
            sub.userId === userId ? { ...sub, status: status } : sub
          )
        );
        // alert(data.message);
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error marking status:", error);
      alert("Failed to update status");
    }
  };

  const getWorkingDaysInMonth = (year, month) => {
    let count = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    }
    return count;
  };

  const getWorkingDaysPassed = (year, month, today) => {
    let count = 0;
    for (let day = 1; day < today; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    }
    return count;
  };

  const year = currentTime.getFullYear();
  const month = currentTime.getMonth();
  const today = currentTime.getDate();
  const totalWorkingDays = getWorkingDaysInMonth(year, month);
  const workingDaysPassed = getWorkingDaysPassed(year, month, today);

  const calculateStats = () => {
    // Filter out today's record from history to avoid double counting if it's already there
    const historyExcludingToday = attendanceHistory.filter((a) => {
      const attDate = new Date(a.date);
      const nowDate = new Date();
      // Compare UTC dates
      return !(
        attDate.getUTCFullYear() === nowDate.getUTCFullYear() &&
        attDate.getUTCMonth() === nowDate.getUTCMonth() &&
        attDate.getUTCDate() === nowDate.getUTCDate()
      );
    });

    let presentCount = 0;

    // Calculate from history
    historyExcludingToday.forEach((a) => {
      if (a.status === "present" || a.status === "late") presentCount += 1;
      else if (a.status === "half-day") presentCount += 0.5;
    });

    // Add today's contribution
    if (todayAttendance) {
      if (
        todayAttendance.status === "present" ||
        todayAttendance.status === "late"
      ) {
        presentCount += 1;
      } else if (todayAttendance.status === "half-day") {
        presentCount += 0.5;
      }
      // If absent/on-leave, add 0
    } else if (checkInTime) {
      // Optimistic update: if checked in but no confirmed record yet (rare), assume present
      presentCount += 1;
    }

    return presentCount;
  };

  const daysPresent = calculateStats();
  const daysAbsent = Math.max(0, workingDaysPassed - daysPresent);

  const isCheckInDisabled = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const isPastCutoff =
      hours > hours_attendance ||
      (hours === hours_attendance && minutes >= minutes_attendance);
    return isPastCutoff || checkInTime !== null || loading;
  };

  const isCheckOutDisabled = () => {
    return checkInTime === null || checkOutTime !== null || loading;
  };

  const handleCheckIn = async () => {
    if (!isCheckInDisabled()) {
      setLoading(true);
      try {
        const data = await attendanceAPI.checkIn("Office");
        if (data.success) {
          setCheckInTime(new Date(data.attendance.checkIn.time));
          setTodayAttendance(data.attendance);
        } else {
          alert(data.message || "Failed to check in");
        }
      } catch (error) {
        alert("Failed to check in");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCheckOut = async () => {
    if (!isCheckOutDisabled()) {
      setLoading(true);
      try {
        const data = await attendanceAPI.checkOut("");
        if (data.success) {
          setCheckOutTime(new Date(data.attendance.checkOut.time));
          setTodayAttendance(data.attendance);
        } else {
          alert(data.message || "Failed to check out");
        }
      } catch (error) {
        alert("Failed to check out");
      } finally {
        setLoading(false);
      }
    }
  };

  const formatTime = (date) => {
    if (!date) return "--:--:--";
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatClockTime = (date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getWorkingHours = () => {
    if (!checkInTime || !checkOutTime) return "--:--";
    const diff = checkOutTime - checkInTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const monthName = currentTime.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="attendance-page">
      {/* Personal Attendance - Hide for OFFICER_IN_CHARGE or users without mark permission */}
      {user.role !== "OFFICER_IN_CHARGE" && canAccessFeature('attendance.mark') && (
        <>
          <div className="attendance-page-header">
            <h2>Attendance</h2>
            <p>Mark your daily attendance</p>
          </div>

          <div className="attendance-main">
            <div className="clock-section">
              <div className="live-clock-display">
                <Clock size={32} />
                <span className="clock-time-large">
                  {formatClockTime(currentTime)}
                </span>
              </div>
              <div className="clock-date">
                {currentTime.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              {(currentTime.getHours() > hours_attendance ||
                (currentTime.getHours() === hours_attendance &&
                  currentTime.getMinutes() >= minutes_attendance)) &&
                !checkInTime && (
                  <div className="late-warning">
                    Check-in closed after {hours_attendance}:
                    {minutes_attendance.toString().padStart(2, "0")} AM
                  </div>
                )}
            </div>

            <div className="checkin-section">
              <div className="checkin-card">
                <div className="checkin-info">
                  <LogIn size={24} />
                  <div>
                    <span className="checkin-label">Check In</span>
                    <span className="checkin-time">
                      {formatTime(checkInTime)}
                    </span>
                  </div>
                </div>
                <button
                  className={`checkin-btn ${
                    isCheckInDisabled() ? "disabled" : ""
                  }`}
                  onClick={handleCheckIn}
                  disabled={isCheckInDisabled()}
                >
                  {checkInTime ? "Checked In" : "Check In"}
                </button>
              </div>

              <div className="checkin-card">
                <div className="checkin-info">
                  <LogOut size={24} />
                  <div>
                    <span className="checkin-label">Check Out</span>
                    <span className="checkin-time">
                      {formatTime(checkOutTime)}
                    </span>
                  </div>
                </div>
                <button
                  className={`checkout-btn ${
                    isCheckOutDisabled() ? "disabled" : ""
                  }`}
                  onClick={handleCheckOut}
                  disabled={isCheckOutDisabled()}
                >
                  {checkOutTime ? "Checked Out" : "Check Out"}
                </button>
              </div>

              {checkInTime && checkOutTime && (
                <div className="working-hours-display">
                  <span>Total Working Hours</span>
                  <strong>{getWorkingHours()}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="attendance-stats-section">
            <h3>
              <Calendar size={20} /> {monthName} Summary
            </h3>
            <div className="stats-cards">
              <div className="att-stat-card total">
                <span className="att-stat-number">{totalWorkingDays}</span>
                <span className="att-stat-label">Total Working Days</span>
              </div>
              <div className="att-stat-card present">
                <CheckCircle size={20} />
                <span className="att-stat-number">{daysPresent}</span>
                <span className="att-stat-label">Days Present</span>
              </div>
              <div className="att-stat-card absent">
                <XCircle size={20} />
                <span className="att-stat-number">
                  {daysAbsent < 0 ? 0 : daysAbsent}
                </span>
                <span className="att-stat-label">Days Absent</span>
              </div>
            </div>
          </div>

          <div className="today-status-section">
            <h3>Today's Status</h3>
            <div
              className={`status-badge-large ${
                checkInTime
                  ? checkOutTime
                    ? "completed"
                    : "working"
                  : currentTime.getHours() > hours_attendance ||
                    (currentTime.getHours() === hours_attendance &&
                      currentTime.getMinutes() >= minutes_attendance)
                  ? "absent"
                  : "pending"
              }`}
            >
              {checkInTime
                ? checkOutTime
                  ? "Attendance Completed"
                  : "Currently Working"
                : currentTime.getHours() > hours_attendance ||
                  (currentTime.getHours() === hours_attendance &&
                    currentTime.getMinutes() >= minutes_attendance)
                ? "Marked Absent"
                : "Not Checked In Yet"}
            </div>
          </div>
        </>
      )}

      {user.role === "OFFICER_IN_CHARGE" && subordinates.length > 0 && (
        <div className="subordinates-section">
          <h3>Team Attendance</h3>
          <div className="subordinates-list">
            {subordinates.map((sub) => (
              <div key={sub.userId} className="subordinate-card">
                <div className="sub-info">
                  <span className="sub-name">{sub.name}</span>
                  <span className="sub-role">
                    {sub.designation || "Employee"}
                  </span>
                  <span className={`sub-status status-${sub.status}`}>
                    {sub.status.replace("-", " ").toUpperCase()}
                  </span>
                </div>
                <div className="sub-actions">
                  <button
                    className={`action-btn btn-present ${
                      sub.status === "present" ? "active" : ""
                    }`}
                    onClick={() => handleMarkStatus(sub.userId, "present")}
                  >
                    P
                  </button>
                  <button
                    className={`action-btn btn-absent ${
                      sub.status === "absent" ? "active" : ""
                    }`}
                    onClick={() => handleMarkStatus(sub.userId, "absent")}
                  >
                    A
                  </button>
                  <button
                    className={`action-btn btn-halfday ${
                      sub.status === "half-day" ? "active" : ""
                    }`}
                    onClick={() => handleMarkStatus(sub.userId, "half-day")}
                  >
                    HD
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message for users without mark attendance permission */}
      {user.role !== "OFFICER_IN_CHARGE" && !canAccessFeature('attendance.mark') && (
        <div className="attendance-page-header">
          <h2>Attendance</h2>
          <p style={{ color: '#f59e0b', marginTop: '20px', fontSize: '16px' }}>
            You do not have permission to mark attendance. Please contact your administrator.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceRecord;
