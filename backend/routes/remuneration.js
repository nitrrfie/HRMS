const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, isManagement } = require('../middleware/auth');

// Indian National Holidays 2025 (Gazetted)
const NATIONAL_HOLIDAYS = {
    2025: [
        { date: '2025-01-26', name: 'Republic Day' },
        { date: '2025-03-14', name: 'Holi' },
        { date: '2025-03-31', name: 'Eid al-Fitr' },
        { date: '2025-04-14', name: 'Ambedkar Jayanti' },
        { date: '2025-04-18', name: 'Good Friday' },
        { date: '2025-05-12', name: 'Buddha Purnima' },
        { date: '2025-06-07', name: 'Eid al-Adha' },
        { date: '2025-07-06', name: 'Muharram' },
        { date: '2025-08-15', name: 'Independence Day' },
        { date: '2025-08-16', name: 'Janmashtami' },
        { date: '2025-09-05', name: 'Milad-un-Nabi' },
        { date: '2025-10-02', name: 'Gandhi Jayanti' },
        { date: '2025-10-20', name: 'Diwali' },
        { date: '2025-11-05', name: 'Guru Nanak Jayanti' },
        { date: '2025-12-25', name: 'Christmas' }
    ]
};

// Helper: Get number of days in a month
const getDaysInMonth = (year, month) => {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

// Helper: Count weekends (Sat + Sun) in a month from a start date
const countWeekends = (year, month, startDay = 1) => {
    const daysInMonth = getDaysInMonth(year, month);
    let count = 0;
    for (let day = startDay; day <= daysInMonth; day++) {
        const date = new Date(Date.UTC(year, month - 1, day));
        const dayOfWeek = date.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) count++;
    }
    return count;
};

// Helper: Count national holidays in a month from a start date
const countHolidays = (year, month, startDay = 1) => {
    const holidays = NATIONAL_HOLIDAYS[year] || [];
    let count = 0;
    holidays.forEach(h => {
        const hDate = new Date(h.date);
        if (hDate.getUTCFullYear() === year &&
            (hDate.getUTCMonth() + 1) === month &&
            hDate.getUTCDate() >= startDay) {
            // Check if holiday falls on a weekend (don't double count)
            const dayOfWeek = hDate.getUTCDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
        }
    });
    return count;
};

// @route   GET /api/remuneration/attendance-summary
// @desc    Get attendance summary for all employees for a month
// @access  Management only
router.get('/attendance-summary', protect, isManagement, async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and year are required' });
        }

        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        // Check if it's the current month - if so, return empty
        const now = new Date();
        if (yearNum === now.getUTCFullYear() && monthNum === (now.getUTCMonth() + 1)) {
            return res.json({
                success: true,
                isCurrentMonth: true,
                message: 'Current month data not available yet',
                employees: []
            });
        }

        // Get all employees (exclude FACULTY_IN_CHARGE and OFFICER_IN_CHARGE)
        const users = await User.find({
            role: { $nin: ['FACULTY_IN_CHARGE', 'OFFICER_IN_CHARGE'] },
            isActive: true
        }).select('username profile employment role');

        const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
        const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
        const daysInMonth = new Date(Date.UTC(yearNum, monthNum, 0)).getUTCDate();

        // Fetch attendance for all employees for the month
        const allAttendance = await Attendance.find({
            date: { $gte: startDate, $lte: endDate }
        });

        // Build summary for each employee
        const employeeSummaries = users.map(user => {
            // Get employee's joining date
            const joiningDate = user.employment?.dateOfJoining
                ? new Date(user.employment.dateOfJoining)
                : null;

            // Calculate start day for this employee (1 if joined before this month)
            let effectiveStartDay = 1;
            if (joiningDate && joiningDate.getUTCFullYear() === yearNum &&
                (joiningDate.getUTCMonth() + 1) === monthNum) {
                effectiveStartDay = joiningDate.getUTCDate();
            } else if (joiningDate && joiningDate > endDate) {
                // Joined after this month - no data
                return {
                    employeeId: user._id,
                    name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.username,
                    designation: user.employment?.designation || user.role,
                    dateOfJoining: user.employment?.dateOfJoining,
                    daysWorked: 0,
                    daysAbsent: 0,
                    casualLeave: 0,
                    weeklyOffs: 0,
                    holidays: 0,
                    lwpDays: 0,
                    totalDays: 0,
                    payableDays: 0
                };
            }

            // Filter attendance for this user
            const userAttendance = allAttendance.filter(
                a => a.user.toString() === user._id.toString()
            );

            // Count days present (present or late)
            const daysWorked = userAttendance.filter(
                a => a.status === 'present' || a.status === 'late'
            ).length;

            // Count days on leave (full leave + 0.5 for half day)
            const fullLeaveCount = userAttendance.filter(
                a => a.status === 'on-leave'
            ).length;

            const halfDayCount = userAttendance.filter(
                a => a.status === 'half-day'
            ).length;

            const casualLeave = fullLeaveCount + (halfDayCount * 0.5);

            // Count days absent
            const daysAbsent = userAttendance.filter(
                a => a.status === 'absent'
            ).length;

            // Calculate weekends and holidays from effective start day
            const weeklyOffs = countWeekends(yearNum, monthNum, effectiveStartDay);
            const holidays = countHolidays(yearNum, monthNum, effectiveStartDay);

            // Total working days for this employee
            const totalDaysForEmployee = daysInMonth - effectiveStartDay + 1;

            // LWP = days absent (from attendance records with 'absent' status)
            const lwpDays = daysAbsent;

            // Payable days = Total days - LWP
            const payableDays = totalDaysForEmployee - lwpDays;

            return {
                employeeId: user._id,
                name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.username,
                designation: user.employment?.designation || user.role,
                dateOfJoining: user.employment?.dateOfJoining,
                grossRemuneration: user.employment?.grossRemuneration || 0,
                daysWorked,
                daysAbsent,
                casualLeave,
                weeklyOffs,
                holidays,
                lwpDays,
                totalDays: totalDaysForEmployee,
                payableDays
            };
        });

        res.json({
            success: true,
            month: monthNum,
            year: yearNum,
            daysInMonth,
            employees: employeeSummaries
        });

    } catch (error) {
        console.error('Attendance summary error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

module.exports = router;
