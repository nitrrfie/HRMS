const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const seedUsers = async () => {
    try {
        await connectDB();
        
        // Seed CEO
        const existingCEO = await User.findOne({ username: 'medha' });
        
        if (!existingCEO) {
            await User.create({
                employeeId: 'NITR-CEO-001',
                username: 'medha',
                email: 'ceo@nitrrfie.com',
                password: 'medha',
                role: 'CEO',
                profile: {
                    firstName: 'Medha',
                    lastName: 'CEO',
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
                    joiningDate: new Date('2020-01-01'),
                    employmentType: 'Full-time',
                    salary: {
                        basic: 150000,
                        hra: 50000,
                        allowances: 50000,
                        deductions: 0
                    }
                },
                leaveBalance: {
                    casualLeave: 12,
                    onDutyLeave: 15,
                    leaveWithoutPay: 0
                }
            });
            console.log('CEO user created successfully');
            console.log('Username: medha');
            console.log('Password: medha');
        } else {
            console.log('CEO user already exists');
        }
        
        // Seed Incubation Manager
        const existingManager = await User.findOne({ username: 'sunil' });
        
        if (!existingManager) {
            await User.create({
                employeeId: 'NITR-MGR-001',
                username: 'sunil',
                email: 'manager@nitrrfie.com',
                password: 'sunil',
                role: 'INCUBATION_MANAGER',
                profile: {
                    firstName: 'Sunil',
                    lastName: 'Manager',
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
                    joiningDate: new Date('2021-03-01'),
                    employmentType: 'Full-time',
                    salary: {
                        basic: 80000,
                        hra: 30000,
                        allowances: 20000,
                        deductions: 0
                    }
                },
                leaveBalance: {
                    casualLeave: 12,
                    onDutyLeave: 15,
                    leaveWithoutPay: 0
                }
            });
            console.log('Incubation Manager user created successfully');
            console.log('Username: sunil');
            console.log('Password: sunil');
        } else {
            console.log('Incubation Manager user already exists');
        }
        
        // Seed Accountant
        const existingAccountant = await User.findOne({ username: 'ashok' });
        
        if (!existingAccountant) {
            await User.create({
                employeeId: 'NITR-ACC-001',
                username: 'ashok',
                email: 'accountant@nitrrfie.com',
                password: 'ashok',
                role: 'ACCOUNTANT',
                profile: {
                    firstName: 'Ashok',
                    lastName: 'Accountant',
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
                    designation: 'Accountant',
                    department: 'Finance',
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
                }
            });
            console.log('Accountant user created successfully');
            console.log('Username: ashok');
            console.log('Password: ashok');
        } else {
            console.log('Accountant user already exists');
        }
        
        const existingFacultyInCharge = await User.findOne({ username: 'anuj' });
        
        if (!existingFacultyInCharge) {
            await User.create({
                employeeId: 'NITR-FIC-001',
                username: 'anuj',
                email: 'facultyincharge@nitrrfie.com',
                password: 'anuj',
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
                }
            });
            console.log('Faculty In Charge user created successfully');
            console.log('Username: anuj');
            console.log('Password: anuj');
        } else {
            console.log('Faculty In Charge user already exists');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error.message);
        process.exit(1);
    }
};

seedUsers();
