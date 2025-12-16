const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["Casual Leave", "On Duty Leave", "Leave Without Pay"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    numberOfDays: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    contactNo: {
      type: String,
      required: true,
    },
    personInCharge: {
      type: String,
      required: true,
    },
    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    personInChargeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    appliedOn: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedOn: Date,
    reviewRemarks: String,
    leaveBalanceBefore: {
      casualLeave: Number,
      onDutyLeave: Number,
      leaveWithoutPay: Number,
    },
    leaveBalanceAfter: {
      casualLeave: Number,
      onDutyLeave: Number,
      leaveWithoutPay: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", LeaveSchema);
