const express = require("express");
const router = express.Router();
const Leave = require("../models/Leave");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const { protect, isAdminOrCEO } = require("../middleware/auth");

router.post("/apply", protect, async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      numberOfDays,
      reason,
      contactNo,
      personInCharge,
      reportingToId,
      personInChargeId,
    } = req.body;

    const user = await User.findById(req.user._id);

    // NOTE:
    // - reportingToId is the approver (who receives the leave request)
    // - personInCharge is the replacement person during absence (free text)
    // Legacy support: older clients may send the approver as personInChargeId.
    const approverId = reportingToId;

    if (!approverId) {
      return res.status(400).json({ message: "Reporting to is required" });
    }

    if (!personInCharge) {
      return res
        .status(400)
        .json({ message: "Person in-charge in absence is required" });
    }

    const approverUser = await User.findById(approverId).select(
      "username profile.firstName profile.lastName"
    );
    if (!approverUser) {
      return res.status(400).json({ message: "Selected approver not found" });
    }

    const leave = await Leave.create({
      user: req.user._id,
      leaveType,
      startDate,
      endDate,
      numberOfDays,
      reason,
      contactNo,
      personInCharge,
      reportingTo: approverUser._id,
      leaveBalanceBefore: {
        casualLeave: user.leaveBalance.casualLeave,
        onDutyLeave: user.leaveBalance.onDutyLeave,
        leaveWithoutPay: user.leaveBalance.leaveWithoutPay,
      },
    });

    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      leave,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/my", protect, async (req, res) => {
  try {
    const { status, year } = req.query;

    let query = { user: req.user._id };

    if (status) query.status = status;
    if (year) {
      const startOfYear = new Date(Date.UTC(year, 0, 1));
      const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
      query.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    const leaves = await Leave.find(query)
      .populate("reviewedBy", "username profile.firstName profile.lastName")
      .sort({ appliedOn: -1 });

    const user = await User.findById(req.user._id).select("leaveBalance");

    res.json({
      success: true,
      leaves,
      leaveBalance: user.leaveBalance,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/all", protect, async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status) query.status = status;

    const leaves = await Leave.find(query)
      .populate(
        "user",
        "username profile.firstName profile.lastName employment.designation"
      )
      .populate("reviewedBy", "username profile.firstName profile.lastName")
      .sort({ appliedOn: -1 });

    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/pending", protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === "ADMIN" || req.user.role === "CEO";

    const query = isAdmin
      ? { status: "pending" }
      : { status: "pending", reportingTo: req.user._id };

    const leaves = await Leave.find(query)
      .populate(
        "user",
        "username profile.firstName profile.lastName employment.designation leaveBalance"
      )
      .populate("reportingTo", "username profile.firstName profile.lastName")
      .sort({ appliedOn: -1 });

    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id/approve", protect, async (req, res) => {
  try {
    const { remarks } = req.body;

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: "Leave application not found" });
    }

    if (leave.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Leave application already processed" });
    }

    const isAdmin = req.user.role === "ADMIN" || req.user.role === "CEO";
    const isAssignedApprover =
      leave.reportingTo && String(leave.reportingTo) === String(req.user._id);
    if (!isAdmin && !isAssignedApprover) {
      return res.status(403).json({
        message:
          "Access denied. Only assigned approver can approve this leave.",
      });
    }

    // Leave policy:
    // - Casual Leave is limited by user's annual entitlement (user.leaveBalance.casualLeave)
    // - On Duty Leave and Leave Without Pay are unlimited (approver decides)
    const user = await User.findById(leave.user).select("leaveBalance");

    let casualRemainingAfterApproval = user?.leaveBalance?.casualLeave ?? 0;

    if (leave.leaveType === "Casual Leave") {
      const year = new Date(leave.startDate).getUTCFullYear();
      const startOfYear = new Date(Date.UTC(year, 0, 1));
      const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

      const approvedSoFarAgg = await Leave.aggregate([
        {
          $match: {
            user: leave.user,
            status: "approved",
            leaveType: "Casual Leave",
            startDate: { $gte: startOfYear, $lte: endOfYear },
          },
        },
        { $group: { _id: null, total: { $sum: "$numberOfDays" } } },
      ]);

      const approvedSoFar = Number(approvedSoFarAgg?.[0]?.total ?? 0);
      const entitlement = Number(user?.leaveBalance?.casualLeave ?? 0);
      const remainingBefore = Math.max(entitlement - approvedSoFar, 0);

      if (leave.numberOfDays > remainingBefore) {
        return res
          .status(400)
          .json({ message: "Insufficient casual leave balance" });
      }

      casualRemainingAfterApproval = Math.max(
        entitlement - (approvedSoFar + Number(leave.numberOfDays || 0)),
        0
      );
    }

    leave.status = "approved";
    leave.reviewedBy = req.user._id;
    leave.reviewedOn = new Date();
    leave.reviewRemarks = remarks;
    leave.leaveBalanceAfter = {
      casualLeave:
        leave.leaveType === "Casual Leave"
          ? casualRemainingAfterApproval
          : user?.leaveBalance?.casualLeave,
      // Unlimited leave types: keep schema values as-is (UI displays 'Unlimited')
      onDutyLeave: user?.leaveBalance?.onDutyLeave,
      leaveWithoutPay: user?.leaveBalance?.leaveWithoutPay,
    };

    await leave.save();

    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);

    for (
      let d = new Date(leaveStart);
      d <= leaveEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dateOnly = new Date(d);
      dateOnly.setUTCHours(0, 0, 0, 0);

      await Attendance.findOneAndUpdate(
        { user: leave.user, date: dateOnly },
        {
          user: leave.user,
          date: dateOnly,
          status: "on-leave",
          remarks: `${leave.leaveType} - ${leave.reason}`,
        },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      message: "Leave approved successfully",
      leave,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id/reject", protect, async (req, res) => {
  try {
    const { remarks } = req.body;

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: "Leave application not found" });
    }

    if (leave.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Leave application already processed" });
    }

    const isAdmin = req.user.role === "ADMIN" || req.user.role === "CEO";
    const isAssignedApprover =
      leave.reportingTo && String(leave.reportingTo) === String(req.user._id);
    if (!isAdmin && !isAssignedApprover) {
      return res.status(403).json({
        message: "Access denied. Only assigned approver can reject this leave.",
      });
    }

    leave.status = "rejected";
    leave.reviewedBy = req.user._id;
    leave.reviewedOn = new Date();
    leave.reviewRemarks = remarks || "Leave request rejected";

    await leave.save();

    res.json({
      success: true,
      message: "Leave rejected",
      leave,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate(
        "user",
        "username profile.firstName profile.lastName employment.designation"
      )
      .populate("reviewedBy", "username profile.firstName profile.lastName");

    if (!leave) {
      return res.status(404).json({ message: "Leave application not found" });
    }

    res.json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
