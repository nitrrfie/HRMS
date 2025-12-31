const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect, isAdminOrCEO } = require('../middleware/auth');

router.post('/check-in', protect, async (req, res) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

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

        // Get user's name to store in attendance
        const userName = req.user.profile?.firstName
            ? `${req.user.profile.firstName} ${req.user.profile.lastName || ''}`.trim()
            : req.user.username;

        let attendance;
        if (existingAttendance) {
            existingAttendance.checkIn = {
                time: now,
                ip: req.ip
            };
            existingAttendance.status = isLate ? 'late' : 'present';
            existingAttendance.isLate = isLate;
            existingAttendance.userName = userName;
            attendance = await existingAttendance.save();
        } else {
            attendance = await Attendance.create({
                user: req.user._id,
                userName: userName,
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
        today.setUTCHours(0, 0, 0, 0);

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
            startDate = new Date(Date.UTC(year, month - 1, 1));
            endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        } else {
            const now = new Date();
            startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        }

        const attendance = await Attendance.aggregate([
            {
                $match: {
                    user: req.user._id,
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $addFields: {
                    userName: {
                        $concat: [
                            { $ifNull: ['$userDetails.profile.firstName', ''] },
                            ' ',
                            { $ifNull: ['$userDetails.profile.lastName', ''] }
                        ]
                    },
                    username: '$userDetails.username'
                }
            },
            {
                $project: {
                    userDetails: 0
                }
            },
            {
                $sort: { date: -1 }
            }
        ]);

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
        today.setUTCHours(0, 0, 0, 0);

        const attendance = await Attendance.aggregate([
            {
                $match: {
                    user: req.user._id,
                    date: today
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true }
            },
            {
                $addFields: {
                    userName: {
                        $concat: [
                            { $ifNull: ['$userDetails.profile.firstName', ''] },
                            ' ',
                            { $ifNull: ['$userDetails.profile.lastName', ''] }
                        ]
                    },
                    username: '$userDetails.username'
                }
            },
            {
                $project: {
                    userDetails: 0
                }
            }
        ]);

        res.json({ success: true, attendance: attendance[0] || null });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/all', protect, async (req, res) => {
    try {
        const { date } = req.query;

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setUTCHours(0, 0, 0, 0);

        const attendance = await Attendance.aggregate([
            {
                $match: { date: targetDate }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $addFields: {
                    userName: {
                        $concat: [
                            { $ifNull: ['$userDetails.profile.firstName', ''] },
                            ' ',
                            { $ifNull: ['$userDetails.profile.lastName', ''] }
                        ]
                    },
                    username: '$userDetails.username',
                    designation: '$userDetails.employment.designation',
                    role: '$userDetails.role'
                }
            },
            {
                $project: {
                    userDetails: 0
                }
            },
            {
                $sort: { 'checkIn.time': 1 }
            }
        ]);

        const allUsers = await User.find({ isActive: true })
            .select('username profile.firstName profile.lastName employment.designation role');

        const presentUserIds = attendance.map(a => a.user.toString());
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
            startDate = new Date(Date.UTC(year, month - 1, 1));
            endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        } else {
            const now = new Date();
            startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        }

        const attendance = await Attendance.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(req.params.userId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $addFields: {
                    userName: {
                        $concat: [
                            { $ifNull: ['$userDetails.profile.firstName', ''] },
                            ' ',
                            { $ifNull: ['$userDetails.profile.lastName', ''] }
                        ]
                    },
                    username: '$userDetails.username'
                }
            },
            {
                $project: {
                    userDetails: 0
                }
            },
            {
                $sort: { date: -1 }
            }
        ]);

        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get subordinates attendance status for officer view
router.get('/subordinates/status', protect, async (req, res) => {
    try {
        if (req.user.role !== 'OFFICER_IN_CHARGE') {
            return res.status(403).json({ message: 'Access denied. officer only.' });
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Fetch valid roles with hierarchy level between 2 and 4 (CEO down to Employee)
        const RolePermission = require('../models/RolePermission');
        const validRoles = await RolePermission.find({
            hierarchyLevel: { $gte: 2, $lte: 4 }
        }).select('roleId');

        const roleIds = validRoles.map(r => r.roleId);

        // Find users with these roles, excluding the current user
        const subordinates = await User.find({
            role: { $in: roleIds },
            _id: { $ne: req.user._id }
        }).select('profile.firstName profile.lastName employment.designation username role');

        if (!subordinates.length) {
            return res.json({ success: true, subordinates: [] });
        }

        const subordinateIds = subordinates.map(u => u._id);

        // Get attendance for today for these subordinates
        const attendanceRecords = await Attendance.find({
            user: { $in: subordinateIds },
            date: today
        });

        // Combine data
        const result = subordinates.map(sub => {
            const att = attendanceRecords.find(a => a.user.toString() === sub._id.toString());
            return {
                userId: sub._id,
                name: `${sub.profile.firstName} ${sub.profile.lastName || ''}`.trim() || sub.username,
                designation: sub.employment.designation || sub.role,
                status: att ? att.status : 'absent', // Default to absent if no record found
                attendanceId: att ? att._id : null
            };
        });

        res.json({ success: true, subordinates: result });
    } catch (error) {
        console.error('Error fetching subordinates:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Mark attendance status by officer (Present / Absent / Half Day)
router.post('/mark-status', protect, async (req, res) => {
    try {
        const { userId, status } = req.body;

        if (!['present', 'absent', 'half-day'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Verify that the target user reports to the requester (or requester is Admin/CEO)
        const targetUser = await User.findById(userId);
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        const isSubordinate = targetUser.employment?.reportingTo?.toString() === req.user._id.toString();
        const canManage = isSubordinate || ['ADMIN', 'CEO'].includes(req.user.role);

        if (!canManage) {
            return res.status(403).json({ message: 'Not authorized to manage this user' });
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({ user: userId, date: today });
        const previousStatus = attendance ? attendance.status : 'absent'; // Logical default for non-existant record

        // Handle transaction for Half Day (update User leave balance)
        if (status === 'half-day' && previousStatus !== 'half-day') {
            // Deduct 0.5 CL, Add 0.5 CL Availed
            await User.findByIdAndUpdate(userId, {
                $inc: {
                    'leaveBalance.casualLeave': -0.5,
                    'leaveBalance.casualLeaveAvailed': 0.5
                }
            });
        } else if (previousStatus === 'half-day' && status !== 'half-day') {
            // Revert: Add 0.5 CL, Deduct 0.5 CL Availed
            await User.findByIdAndUpdate(userId, {
                $inc: {
                    'leaveBalance.casualLeave': 0.5,
                    'leaveBalance.casualLeaveAvailed': -0.5
                }
            });
        }

        if (attendance) {
            attendance.status = status;

            // Auto Check-in/out logic based on status
            const now = new Date();

            if (status === 'present') {
                // If marking present and no check-in exists, create one
                if (!attendance.checkIn || !attendance.checkIn.time) {
                    attendance.checkIn = {
                        time: now,
                        ip: 'Manual (Admin)'
                    };
                    // Ensure isLate is false if manually marked present
                    attendance.isLate = false;
                }
            } else if (status === 'half-day' || status === 'absent') {
                // If marking absent/half-day and no check-out exists, create one to close the day
                if (!attendance.checkOut || !attendance.checkOut.time) {
                    attendance.checkOut = {
                        time: now,
                        ip: 'Manual (Admin)'
                    };

                    // Calculate working hours if check-in exists
                    if (attendance.checkIn && attendance.checkIn.time) {
                        const diffMs = now - new Date(attendance.checkIn.time);
                        attendance.workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
                    }
                }
            }

            await attendance.save();
        } else {
            // New attendance record
            const now = new Date();
            const attendanceData = {
                user: userId,
                userName: `${targetUser.profile.firstName} ${targetUser.profile.lastName}`.trim(),
                date: today,
                status: status,
            };

            if (status === 'present') {
                attendanceData.checkIn = {
                    time: now,
                    ip: 'Manual (Admin)'
                };
                attendanceData.isLate = false;
            } else if (status === 'half-day' || status === 'absent') {
                // If starting with absent/half-day, usually implies no work, but to "close" it we might set generic times?
                // User requirement: "check out must be automatically done"
                // If there is no check-in, just setting check-out might be weird but satisfies request.
                // However, usually you need a check-in to have a check-out.
                // Let's set checkOut.
                attendanceData.checkOut = {
                    time: now,
                    ip: 'Manual (Admin)'
                };
            }

            attendance = await Attendance.create(attendanceData);
        }

        res.json({ success: true, message: `Marked as ${status}`, attendance });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;

