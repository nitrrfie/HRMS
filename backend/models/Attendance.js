const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String
    },
    date: {
        type: Date,
        required: true
    },
    checkIn: {
        time: Date,
        location: {
            latitude: Number,
            longitude: Number
        },
        ip: String
    },
    checkOut: {
        time: Date,
        location: {
            latitude: Number,
            longitude: Number
        },
        ip: String
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'half-day', 'late', 'on-leave'],
        default: 'absent'
    },
    workingHours: {
        type: Number,
        default: 0
    },
    isLate: {
        type: Boolean,
        default: false
    },
    lateBy: {
        type: Number,
        default: 0
    },
    remarks: String
}, { timestamps: true });

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

AttendanceSchema.pre('save', function(next) {
    if (this.checkIn?.time && this.checkOut?.time) {
        const diffMs = this.checkOut.time - this.checkIn.time;
        this.workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }
    
    if (this.checkIn?.time) {
        const checkInTime = new Date(this.checkIn.time);
        const cutoffHour = 11;
        if (checkInTime.getHours() >= cutoffHour) {
            this.isLate = true;
            const lateMinutes = (checkInTime.getHours() - cutoffHour) * 60 + checkInTime.getMinutes();
            this.lateBy = lateMinutes;
        }
    }
    next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
