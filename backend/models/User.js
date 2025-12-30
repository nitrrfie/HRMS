const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { SYSTEM_ROLES } = require('../lib/roles');

const UserSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: SYSTEM_ROLES,
        default: 'EMPLOYEE'
    },
    profile: {
        firstName: String,
        lastName: String,
        phone: String,
        dateOfBirth: Date,
        gender: { type: String, enum: ['Male', 'Female', 'Other'] },
        address: {
            street: String,
            city: String,
            state: String,
            pincode: String
        },
        emergencyContact: {
            name: String,
            relation: String,
            phone: String
        },
        photo: String
    },
    employment: {
        designation: String,
        department: String,
        joiningDate: Date,
        employmentType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Intern'] },
        reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        // Used by Remuneration / payroll views (gross/base remuneration)
        baseSalary: Number,
        salary: {
            basic: Number,
            hra: Number,
            allowances: Number,
            deductions: Number
        }
    },
    documents: {
        aadhar: { number: String, file: String },
        pan: { number: String, file: String },
        resume: String,
        offerLetter: String,
        other: [{ name: String, file: String }]
    },
    bankDetails: {
        accountNumber: String,
        bankName: String,
        ifscCode: String,
        branch: String
    },
    leaveBalance: {
        casualLeave: { type: Number, default: 12 },
        onDutyLeave: { type: Number, default: 10 },
        leaveWithoutPay: { type: Number, default: 0 },
        casualLeaveAvailed: { type: Number, default: 0 }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
    try {
        if (!this.isModified('password')) return next();
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (err) {
        return next(err);
    }
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
