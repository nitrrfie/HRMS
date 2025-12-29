import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import './AttendanceRecord.css';
import { hours_attendance } from '../services/attendance';

const AttendanceRecord = () => {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [checkInTime, setCheckInTime] = useState(null);
    const [checkOutTime, setCheckOutTime] = useState(null);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchMyAttendance();
    }, []);

    const fetchMyAttendance = async () => {
        try {
            const data = await attendanceAPI.getMy(currentTime.getMonth() + 1, currentTime.getFullYear());
            if (data.success) {
                setAttendanceHistory(data.attendance || []);
                const today = data.attendance?.find(a => {
                    const attDate = new Date(a.date).toDateString();
                    return attDate === new Date().toDateString();
                });
                if (today) {
                    setTodayAttendance(today);
                    if (today.checkIn?.time) setCheckInTime(new Date(today.checkIn.time));
                    if (today.checkOut?.time) setCheckOutTime(new Date(today.checkOut.time));
                }
            }
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
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
    
    const daysPresent = attendanceHistory.filter(a => a.status === 'present').length + (checkInTime ? 1 : 0);
    const daysAbsent = workingDaysPassed - attendanceHistory.filter(a => a.status === 'present').length;

    const isCheckInDisabled = () => {
        const hours = currentTime.getHours();
        return hours >= hours_attendance || checkInTime !== null || loading;
    };

    const isCheckOutDisabled = () => {
        return checkInTime === null || checkOutTime !== null || loading;
    };

    const handleCheckIn = async () => {
        if (!isCheckInDisabled()) {
            setLoading(true);
            try {
                const data = await attendanceAPI.checkIn('Office');
                if (data.success) {
                    setCheckInTime(new Date(data.attendance.checkIn.time));
                    setTodayAttendance(data.attendance);
                } else {
                    alert(data.message || 'Failed to check in');
                }
            } catch (error) {
                alert('Failed to check in');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCheckOut = async () => {
        if (!isCheckOutDisabled()) {
            setLoading(true);
            try {
                const data = await attendanceAPI.checkOut('');
                if (data.success) {
                    setCheckOutTime(new Date(data.attendance.checkOut.time));
                    setTodayAttendance(data.attendance);
                } else {
                    alert(data.message || 'Failed to check out');
                }
            } catch (error) {
                alert('Failed to check out');
            } finally {
                setLoading(false);
            }
        }
    };

    const formatTime = (date) => {
        if (!date) return '--:--:--';
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    };

    const formatClockTime = (date) => {
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    };

    const getWorkingHours = () => {
        if (!checkInTime || !checkOutTime) return '--:--';
        const diff = checkOutTime - checkInTime;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    const monthName = currentTime.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div className="attendance-page">
            <div className="attendance-page-header">
                <h2>Attendance</h2>
                <p>Mark your daily attendance</p>
            </div>

            <div className="attendance-main">
                <div className="clock-section">
                    <div className="live-clock-display">
                        <Clock size={32} />
                        <span className="clock-time-large">{formatClockTime(currentTime)}</span>
                    </div>
                    <div className="clock-date">
                        {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {currentTime.getHours() >= hours_attendance && !checkInTime && (
                        <div className="late-warning">Check-in closed after {hours_attendance}:00 AM</div>
                    )}
                </div>

                <div className="checkin-section">
                    <div className="checkin-card">
                        <div className="checkin-info">
                            <LogIn size={24} />
                            <div>
                                <span className="checkin-label">Check In</span>
                                <span className="checkin-time">{formatTime(checkInTime)}</span>
                            </div>
                        </div>
                        <button 
                            className={`checkin-btn ${isCheckInDisabled() ? 'disabled' : ''}`}
                            onClick={handleCheckIn}
                            disabled={isCheckInDisabled()}
                        >
                            {checkInTime ? 'Checked In' : 'Check In'}
                        </button>
                    </div>

                    <div className="checkin-card">
                        <div className="checkin-info">
                            <LogOut size={24} />
                            <div>
                                <span className="checkin-label">Check Out</span>
                                <span className="checkin-time">{formatTime(checkOutTime)}</span>
                            </div>
                        </div>
                        <button 
                            className={`checkout-btn ${isCheckOutDisabled() ? 'disabled' : ''}`}
                            onClick={handleCheckOut}
                            disabled={isCheckOutDisabled()}
                        >
                            {checkOutTime ? 'Checked Out' : 'Check Out'}
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
                <h3><Calendar size={20} /> {monthName} Summary</h3>
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
                        <span className="att-stat-number">{daysAbsent < 0 ? 0 : daysAbsent}</span>
                        <span className="att-stat-label">Days Absent</span>
                    </div>
                </div>
            </div>

            <div className="today-status-section">
                <h3>Today's Status</h3>
                <div className={`status-badge-large ${checkInTime ? (checkOutTime ? 'completed' : 'working') : (currentTime.getHours() >= hours_attendance ? 'absent' : 'pending')}`}>
                    {checkInTime ? (checkOutTime ? 'Attendance Completed' : 'Currently Working') : (currentTime.getHours() >= hours_attendance ? 'Marked Absent' : 'Not Checked In Yet')}
                </div>
            </div>
        </div>
    );
};

export default AttendanceRecord;
