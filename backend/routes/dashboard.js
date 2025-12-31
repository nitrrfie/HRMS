const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const { protect, isManagement } = require("../middleware/auth");

router.get("/", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Check if user is management
    const managementRoles = [
      'ADMIN',
      'CEO',
      'FACULTY_IN_CHARGE',
      'OFFICER_IN_CHARGE',
      'INCUBATION_MANAGER',
      'ACCOUNTANT'
    ];
    const isUserManagement = managementRoles.includes(req.user.role);

    // For management: show all employees and full statistics
    // For regular employees: show limited stats (total employees and present today)
    const totalEmployees = await User.countDocuments({
      role: { $nin: ["FACULTY_IN_CHARGE", "ADMIN", "OFFICER_IN_CHARGE"] },
    });

    const todayAttendance = await Attendance.find({
      date: today,
      status: "present",
    });
    const presentToday = todayAttendance.length;

    const onLeaveToday = await Attendance.countDocuments({
      date: today,
      status: "on-leave",
    });

    const pendingLeaves = await Leave.countDocuments({ status: "pending" });

    // Only show detailed attendance list to management
    let employeeAttendance = [];
    if (isUserManagement) {
      const attendanceWithUsers = await Attendance.find({ date: today })
        .populate(
          "user",
          "username profile.firstName profile.lastName employment.designation role"
        )
        .sort({ checkInTime: -1 });

      employeeAttendance = attendanceWithUsers.map((att) => ({
        name: att.user?.profile?.firstName
          ? `${att.user.profile.firstName} ${att.user.profile.lastName || ""}`
          : att.user?.username || "Unknown",
        role: att.user?.employment?.designation || att.user?.role || "Employee",
        status: att.status,
        checkIn: att.checkInTime
          ? new Date(att.checkInTime).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "-",
      }));
    }

    // Activities for management only
    const activities = [];
    if (isUserManagement) {
      const attendanceWithUsers = await Attendance.find({ date: today })
        .populate(
          "user",
          "username profile.firstName profile.lastName"
        )
        .sort({ checkInTime: -1 })
        .limit(3);

      for (const att of attendanceWithUsers) {
        const name = att.user?.profile?.firstName
          ? `${att.user.profile.firstName} ${att.user.profile.lastName || ""}`
          : att.user?.username;
        if (att.checkInTime) {
          const timeDiff = Math.floor(
            (new Date() - new Date(att.checkInTime)) / 60000
          );
          activities.push({
            text: `${name} marked attendance`,
            time:
              timeDiff < 60
                ? `${timeDiff} mins ago`
                : `${Math.floor(timeDiff / 60)} hours ago`,
            type: "attendance",
          });
        }
      }

      const recentLeaves = await Leave.find()
        .populate("user", "username profile.firstName profile.lastName")
        .populate("reviewedBy", "username profile.firstName profile.lastName")
        .sort({ updatedAt: -1 })
        .limit(5);

      for (const leave of recentLeaves) {
        const name = leave.user?.profile?.firstName
          ? `${leave.user.profile.firstName} ${leave.user.profile.lastName || ""}`
          : leave.user?.username;
        if (leave.status === "approved") {
          activities.push({
            text: `Leave approved for ${name}`,
            time: getTimeAgo(leave.reviewedOn),
            type: "approve",
          });
        } else if (leave.status === "pending") {
          activities.push({
            text: `${name} applied for leave`,
            time: getTimeAgo(leave.appliedOn),
            type: "leave",
          });
        }
      }

      activities.sort((a, b) => {
        const timeA = parseTimeAgo(a.time);
        const timeB = parseTimeAgo(b.time);
        return timeA - timeB;
      });
    }

    res.json({
      success: true,
      stats: {
        totalEmployees,
        presentToday,
        onLeave: onLeaveToday,
        pendingLeaves,
      },
      employeeAttendance,
      activities: isUserManagement ? activities.slice(0, 5) : [],
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

function getTimeAgo(date) {
  if (!date) return "recently";
  const diff = Math.floor((new Date() - new Date(date)) / 60000);
  if (diff < 60) return `${diff} mins ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
  if (diff < 10080) return `${Math.floor(diff / 1440)} days ago`;
  return `${Math.floor(diff / 10080)} weeks ago`;
}

function parseTimeAgo(timeStr) {
  const match = timeStr.match(/(\d+)\s*(min|hour|day|week)/);
  if (!match) return 0;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "min":
      return value;
    case "hour":
      return value * 60;
    case "day":
      return value * 1440;
    case "week":
      return value * 10080;
    default:
      return 0;
  }
}

module.exports = router;
