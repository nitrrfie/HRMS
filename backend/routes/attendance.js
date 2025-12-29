const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, isAdminOrCEO } = require('../middleware/auth');

router.post('/check-in', protect, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingAttendance = await Attendance.findOne({
            user: req.user._id,
            date: today
        });
        
        if (existingAttendance && existingAttendance.checkIn?.time) {
            return res.status(400).json({ message: 'Already checked in today' });
        }
        
        const now = new Date();
        const cutoffHour = 11;
        const isLate = now.getHours() >= cutoffHour;
        
        let attendance;
        if (existingAttendance) {
            existingAttendance.checkIn = {
                time: now,
                ip: req.ip
            };
            existingAttendance.status = isLate ? 'late' : 'present';
            existingAttendance.isLate = isLate;
            attendance = await existingAttendance.save();
        } else {
            attendance = await Attendance.create({
                user: req.user._id,
                date: today,
                checkIn: {
                    time: now,
                    ip: req.ip
                },
                status: isLate ? 'late' : 'present',
                isLate
            });
        }
        
        res.json({
            success: true,
            message: isLate ? 'Checked in (Late)' : 'Checked in successfully',
            attendance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.post('/check-out', protect, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const attendance = await Attendance.findOne({
            user: req.user._id,
            date: today
        });
        
        if (!attendance || !attendance.checkIn?.time) {
            return res.status(400).json({ message: 'No check-in found for today' });
        }
        
        if (attendance.checkOut?.time) {
            return res.status(400).json({ message: 'Already checked out today' });
        }
        
        const now = new Date();
        attendance.checkOut = {
            time: now,
            ip: req.ip
        };
        
        const diffMs = now - attendance.checkIn.time;
        attendance.workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        
        if (attendance.workingHours < 4) {
            attendance.status = 'half-day';
        }
        
        await attendance.save();
        
        res.json({
            success: true,
            message: 'Checked out successfully',
            attendance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/my', protect, async (req, res) => {
    try {
        const { month, year } = req.query;
        
        let startDate, endDate;
        
        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        
        const attendance = await Attendance.find({
            user: req.user._id,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });
        
        const stats = {
            present: attendance.filter(a => a.status === 'present').length,
            late: attendance.filter(a => a.status === 'late').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            halfDay: attendance.filter(a => a.status === 'half-day').length,
            onLeave: attendance.filter(a => a.status === 'on-leave').length,
            totalWorkingHours: attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0)
        };
        
        res.json({ success: true, attendance, stats });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/today', protect, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const attendance = await Attendance.findOne({
            user: req.user._id,
            date: today
        });
        
        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/all', protect, async (req, res) => {
    try {
        const { date } = req.query;
        
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        
        const attendance = await Attendance.find({ date: targetDate })
            .populate('user', 'username profile.firstName profile.lastName employment.designation role')
            .sort({ 'checkIn.time': 1 });
        
        const allUsers = await User.find({ isActive: true })
            .select('username profile.firstName profile.lastName employment.designation role');
        
        const presentUserIds = attendance.map(a => a.user._id.toString());
        const absentUsers = allUsers.filter(u => !presentUserIds.includes(u._id.toString()));
        
        res.json({
            success: true,
            date: targetDate,
            attendance,
            absentUsers,
            stats: {
                total: allUsers.length,
                present: attendance.filter(a => a.status === 'present' || a.status === 'late').length,
                absent: absentUsers.length,
                late: attendance.filter(a => a.isLate).length,
                onLeave: attendance.filter(a => a.status === 'on-leave').length
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/user/:userId', protect, async (req, res) => {
    try {
        const { month, year } = req.query;
        
        let startDate, endDate;
        
        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        
        const attendance = await Attendance.find({
            user: req.params.userId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });
        
        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
