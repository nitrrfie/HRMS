const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
<<<<<<< HEAD
const Remuneration = require('../models/Remuneration');
const RolePermission = require('../models/RolePermission');
=======
>>>>>>> parent of 28b11e6 (Updated Remuneration Page)
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
    return new Date(year, month, 0).getDate();
};

// Helper: Count weekends (Sat + Sun) in a month from a start date
const countWeekends = (year, month, startDay = 1) => {
    const daysInMonth = getDaysInMonth(year, month);
    let count = 0;
    for (let day = startDay; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
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
        if (hDate.getFullYear() === year &&
            (hDate.getMonth() + 1) === month &&
            hDate.getDate() >= startDay) {
            // Check if holiday falls on a weekend (don't double count)
            const dayOfWeek = hDate.getDay();
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
        if (yearNum === now.getFullYear() && monthNum === (now.getMonth() + 1)) {
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

        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0);
        const daysInMonth = endDate.getDate();

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
            if (joiningDate && joiningDate.getFullYear() === yearNum &&
                (joiningDate.getMonth() + 1) === monthNum) {
                effectiveStartDay = joiningDate.getDate();
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

            // Count days on leave
            const casualLeave = userAttendance.filter(
                a => a.status === 'on-leave'
            ).length;

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

<<<<<<< HEAD
// @route   POST /api/remuneration/save
// @desc    Save or update remuneration data for employees
// @access  Management only
router.post('/save', protect, isManagement, async (req, res) => {
    try {
        const { remunerationData, month, year } = req.body;

        if (!remunerationData || !month || !year) {
            return res.status(400).json({ 
                success: false, 
                message: 'Remuneration data, month, and year are required' 
            });
        }

        const promises = remunerationData.map(async (data) => {
            return Remuneration.findOneAndUpdate(
                {
                    employee: data.employeeId,
                    month,
                    year
                },
                {
                    employeeId: data.employeeIdString || data.employeeId,
                    grossRemuneration: data.grossRemuneration || 0,
                    daysWorked: data.daysWorked || 0,
                    casualLeave: data.casualLeave || 0,
                    weeklyOff: data.weeklyOff || 0,
                    holidays: data.holidays || 0,
                    lwpDays: data.lwpDays || 0,
                    totalDays: data.totalDays || 0,
                    payableDays: data.payableDays || 0,
                    fixedRemuneration: data.fixedRemuneration || 0,
                    variableRemuneration: data.variableRemuneration || 0,
                    totalRemuneration: data.totalRemuneration || 0,
                    tds: data.tds || 0,
                    otherDeduction: data.otherDeduction || 0,
                    netPayable: data.netPayable || 0,
                    panBankDetails: data.panBankDetails || ''
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        });

        await Promise.all(promises);
        res.json({ success: true, message: 'Remuneration data saved successfully' });
    } catch (error) {
        console.error('Error saving remuneration:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// @route   GET /api/remuneration/get
// @desc    Get remuneration data for a specific month/year
// @access  Management only
router.get('/get', protect, isManagement, async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ 
                success: false, 
                message: 'Month and year are required' 
            });
        }

        const records = await Remuneration.find({
            month,
            year: parseInt(year)
        }).populate('employee', 'username profile employment employeeId documents bankDetails');

        // Create a map of employeeId to remuneration data
        const remunerationMap = {};
        records.forEach(record => {
            remunerationMap[record.employee._id.toString()] = {
                id: record.employee._id,
                employeeId: record.employeeId,
                name: `${record.employee.profile?.firstName || ''} ${record.employee.profile?.lastName || ''}`.trim() || record.employee.username,
                designation: record.employee.employment?.designation || record.employee.role,
                dateOfJoining: record.employee.employment?.dateOfJoining,
                grossRemuneration: record.grossRemuneration,
                daysWorked: record.daysWorked,
                casualLeave: record.casualLeave,
                weeklyOff: record.weeklyOff,
                holidays: record.holidays,
                lwpDays: record.lwpDays,
                totalDays: record.totalDays,
                payableDays: record.payableDays,
                fixedRemuneration: record.fixedRemuneration,
                variableRemuneration: record.variableRemuneration,
                totalRemuneration: record.totalRemuneration,
                tds: record.tds,
                otherDeduction: record.otherDeduction,
                netPayable: record.netPayable,
                panBankDetails: record.panBankDetails,
                pan: record.employee.documents?.pan?.number || (typeof record.employee.documents?.pan === 'string' ? record.employee.documents.pan : 'N/A'),
                bankAccount: record.employee.bankDetails?.accountNumber || 'N/A'
            };
        });

        res.json({ success: true, remunerationMap, records: Object.values(remunerationMap) });
    } catch (error) {
        console.error('Error fetching remuneration:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// @route   GET /api/remuneration/salary
// @desc    Get salary data for employees with permission checks
// @access  Protected - requires salary.viewAll or salary.viewOwn permission
router.get('/salary', protect, async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ 
                success: false, 
                message: 'Month and year are required' 
            });
        }

        // Fetch user permissions from RolePermission model
        const rolePermission = await RolePermission.findOne({ roleId: req.user.role });
        
        if (!rolePermission) {
            return res.status(403).json({ 
                success: false, 
                message: 'No permissions found for your role' 
            });
        }

        // Check if user has salary viewing permissions
        const canViewAll = rolePermission.featureAccess.some(
            p => p.featureId === 'salary.viewAll' && p.hasAccess
        );
        const canViewOwn = rolePermission.featureAccess.some(
            p => p.featureId === 'salary.viewOwn' && p.hasAccess
        );

        if (!canViewAll && !canViewOwn) {
            return res.status(403).json({ 
                success: false, 
                message: 'You do not have permission to view salary data' 
            });
        }

        let query = {
            month,
            year: parseInt(year)
        };

        // If user can only view their own salary, restrict to their employee record
        if (!canViewAll && canViewOwn) {
            query.employee = req.user._id;
        }

        const records = await Remuneration.find(query)
            .populate('employee', 'username profile employment employeeId documents bankDetails role');

        // Filter out FACULTY_IN_CHARGE and OFFICER_IN_CHARGE
        const filteredRecords = records.filter(record => 
            record.employee && 
            record.employee.role !== 'FACULTY_IN_CHARGE' && 
            record.employee.role !== 'OFFICER_IN_CHARGE'
        );

        // Format the data for frontend
        const salaryData = filteredRecords.map(record => ({
            id: record.employee._id,
            employeeId: record.employeeId,
            name: `${record.employee.profile?.firstName || ''} ${record.employee.profile?.lastName || ''}`.trim() || record.employee.username,
            designation: record.employee.employment?.designation || 'N/A',
            pan: record.employee.documents?.pan?.number || (typeof record.employee.documents?.pan === 'string' ? record.employee.documents.pan : 'N/A'),
            bankAccount: record.employee.bankDetails?.accountNumber || 'N/A',
            fixedPay: record.fixedRemuneration || 0,
            variablePay: record.variableRemuneration || 0,
            others: 0,
            tds: record.tds || 0,
            nps: 0,
            otherDeductions: record.otherDeduction || 0,
            grossRemuneration: record.grossRemuneration || 0,
            netPayable: record.netPayable || 0
        }));

        res.json({ 
            success: true, 
            employees: salaryData,
            canViewAll,
            canViewOwn 
        });
    } catch (error) {
        console.error('Error fetching salary data:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

=======
>>>>>>> parent of 28b11e6 (Updated Remuneration Page)
module.exports = router;
