const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const seedUsers = async () => {
    try {
        await connectDB();

        // Generate salt for password hashing
        const salt = await bcrypt.genSalt(10);

        // Hash passwords manually since findOneAndUpdate bypasses pre-save hook
        const medhaPassword = await bcrypt.hash('medha', salt);
        const sunilPassword = await bcrypt.hash('sunil', salt);
        const ashokPassword = await bcrypt.hash('ashok', salt);
        const anujPassword = await bcrypt.hash('anuj', salt);
        const himanshuPassword = await bcrypt.hash('himanshu', salt);
        const nareshPassword = await bcrypt.hash('naresh', salt);

        // Seed CEO
        await User.findOneAndUpdate(
            { username: 'medha' },
            {
                employeeId: 'NITR-CEO-001',
                username: 'medha',
                email: 'ceo@nitrrfie.com',
                password: medhaPassword,
                role: 'CEO',
                profile: {
                    firstName: 'Medha',
                    lastName: 'Singh',
                    phone: '9876543210',
                    address: {
                        street: 'NIT Raipur Campus',
                        city: 'Raipur',
                        state: 'Chhattisgarh',
                        pincode: '492010'
                    },
                    dateOfBirth: new Date('1980-01-01'),
                    gender: 'Female'
                },
                employment: {
                    designation: 'Chief Executive Officer',
                    department: 'Executive',
                    // From Remuneration.jsx (dateOfJoining: 15-07-2025)
                    joiningDate: new Date('2025-07-15'),
                    employmentType: 'Full-time',
                    // From Remuneration.jsx (grossRemuneration)
                    baseSalary: 80000,
                    salary: {
                        basic: 150000,
                        hra: 50000,
                        allowances: 50000,
                        deductions: 0
                    }
                },
                documents: {
                    pan: { number: 'BHRPS4064A' },
                    other: []
                },
                bankDetails: {
                    bankName: 'IDBI Bank',
                    branch: 'Civil Lines, Raipur',
                    accountNumber: '0495104000146716',
                    ifscCode: 'IBKL0000495'
                },
                leaveBalance: {
                    casualLeave: 12,
                    onDutyLeave: 0,
                    leaveWithoutPay: 0
                },
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('CEO user seeded successfully');

        // Seed Incubation Manager
        await User.findOneAndUpdate(
            { username: 'sunil' },
            {
                employeeId: 'NITR-MGR-001',
                username: 'sunil',
                email: 'manager@nitrrfie.com',
                password: sunilPassword,
                role: 'INCUBATION_MANAGER',
                profile: {
                    firstName: 'Sunil',
                    lastName: 'Dewangan',
                    phone: '9876543211',
                    address: {
                        street: 'NIT Raipur Campus',
                        city: 'Raipur',
                        state: 'Chhattisgarh',
                        pincode: '492010'
                    },
                    dateOfBirth: new Date('1985-06-15'),
                    gender: 'Male'
                },
                employment: {
                    designation: 'Incubation Manager',
                    department: 'Operations',
                    // From Remuneration.jsx (dateOfJoining: 10/9/2025)
                    joiningDate: new Date('2025-09-10'),
                    employmentType: 'Full-time',
                    // From Remuneration.jsx (grossRemuneration)
                    baseSalary: 54000,
                    salary: {
                        basic: 80000,
                        hra: 30000,
                        allowances: 20000,
                        deductions: 0
                    }
                },
                documents: {
                    pan: { number: 'BJZPD0141A' },
                    other: []
                },
                bankDetails: {
                    bankName: 'State Bank of India',
                    branch: 'Camp Area Bhilai, Near Power House, Bhilai',
                    accountNumber: '38072524817',
                    ifscCode: 'SBIN0009154'
                },
                leaveBalance: {
                    casualLeave: 8,
                    onDutyLeave: 0,
                    leaveWithoutPay: 0
                },
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('Incubation Manager user seeded successfully');

        // Seed Accountant
        await User.findOneAndUpdate(
            { username: 'ashok' },
            {
                employeeId: 'NITR-ACC-001',
                username: 'ashok',
                email: 'accountant@nitrrfie.com',
                password: ashokPassword,
                role: 'ACCOUNTANT',
                profile: {
                    firstName: 'Ashok',
                    lastName: 'Kumar Sahu',
                    phone: '9876543212',
                    address: {
                        street: 'NIT Raipur Campus',
                        city: 'Raipur',
                        state: 'Chhattisgarh',
                        pincode: '492010'
                    },
                    dateOfBirth: new Date('1988-03-20'),
                    gender: 'Male'
                },
                employment: {
                    // From Remuneration.jsx
                    designation: 'Accountant Cum Administrator',
                    department: 'Finance',
                    // From Remuneration.jsx (dateOfJoining: 30/9/25)
                    joiningDate: new Date('2025-09-30'),
                    employmentType: 'Full-time',
                    // From Remuneration.jsx (grossRemuneration)
                    baseSalary: 32400,
                    salary: {
                        basic: 60000,
                        hra: 25000,
                        allowances: 15000,
                        deductions: 0
                    }
                },
                documents: {
                    pan: { number: 'BCPPA5763A' },
                    other: []
                },
                bankDetails: {
                    bankName: 'State Bank of India',
                    branch: 'Telibandha GE Road, Near Railway Crossing',
                    accountNumber: '30174860333',
                    ifscCode: 'SBIN0005194'
                },
                leaveBalance: {
                    casualLeave: 8,
                    onDutyLeave: 0,
                    leaveWithoutPay: 0
                },
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('Accountant user seeded successfully');

        // Seed Faculty In Charge
        await User.findOneAndUpdate(
            { username: 'anuj' },
            {
                employeeId: 'NITR-FIC-001',
                username: 'anuj',
                email: 'facultyincharge@nitrrfie.com',
                password: anujPassword,
                role: 'FACULTY_IN_CHARGE',
                profile: {
                    firstName: 'Anuj',
                    lastName: 'Shukla',
                    phone: '9136271032',
                    address: {
                        street: 'NIT Raipur Campus',
                        city: 'Raipur',
                        state: 'Chhattisgarh',
                        pincode: '492010'
                    },
                    dateOfBirth: new Date('1988-03-20'),
                    gender: 'Male'
                },
                employment: {
                    designation: 'FACULTY_IN_CHARGE',
                    department: 'NITRRFIE',
                    joiningDate: new Date('2022-01-15'),
                    employmentType: 'Full-time',
                    salary: {
                        basic: 60000,
                        hra: 25000,
                        allowances: 15000,
                        deductions: 0
                    }
                },
                leaveBalance: {
                    casualLeave: 12,
                    onDutyLeave: 15,
                    leaveWithoutPay: 0
                },
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('Faculty In Charge user seeded successfully');

        // Seed Support Staff (from Remuneration.jsx)
        await User.findOneAndUpdate(
            { username: 'himanshu' },
            {
                employeeId: 'NITR-EMP-002',
                username: 'himanshu',
                email: 'himanshu@nitrrfie.com',
                password: himanshuPassword,
                role: 'EMPLOYEE',
                profile: {
                    firstName: 'Himanshu',
                    lastName: 'Verma'
                },
                employment: {
                    designation: 'Support Staff',
                    // From Remuneration.jsx (dateOfJoining: 18/10/25)
                    joiningDate: new Date('2025-10-18'),
                    employmentType: 'Full-time',
                    // From Remuneration.jsx (grossRemuneration)
                    baseSalary: 10000
                },
                documents: {
                    pan: { number: 'CUTPV9394L' },
                    other: []
                },
                bankDetails: {
                    bankName: 'State Bank of India',
                    branch: 'Nesta, Tilda',
                    accountNumber: '39634349811',
                    ifscCode: 'SBIN0001470'
                },
                leaveBalance: {
                    casualLeave: 8,
                    onDutyLeave: 0,
                    leaveWithoutPay: 0
                },
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('Support Staff user seeded successfully');

        // Seed Hardware Maintenance Engineer (from Remuneration.jsx)
        await User.findOneAndUpdate(
            { username: 'naresh' },
            {
                employeeId: 'NITR-EMP-003',
                username: 'naresh',
                email: 'naresh@nitrrfie.com',
                password: nareshPassword,
                role: 'EMPLOYEE',
                profile: {
                    firstName: 'Naresh',
                    lastName: 'Kumar'
                },
                employment: {
                    designation: 'Hardware Maintenance Engineer',
                    // From Remuneration.jsx (dateOfJoining: 24/11/24)
                    joiningDate: new Date('2024-11-24'),
                    employmentType: 'Full-time',
                    // From Remuneration.jsx (grossRemuneration)
                    baseSalary: 25000
                },
                documents: {
                    pan: { number: 'BSVPK8707R' },
                    other: []
                },
                bankDetails: {
                    bankName: 'Union Bank of India',
                    branch: 'Borsi, Durg',
                    accountNumber: '747902010017132',
                    ifscCode: 'UBIN0576708'
                },
                leaveBalance: {
                    casualLeave: 8,
                    onDutyLeave: 0,
                    leaveWithoutPay: 0
                },
                isActive: true
            },
            { upsert: true, new: true }
        );
        console.log('Hardware Maintenance Engineer user seeded successfully');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error.message);
        process.exit(1);
    }
};

seedUsers();
