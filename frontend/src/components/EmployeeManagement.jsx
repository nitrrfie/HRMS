import { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreVertical, Mail, Phone, MapPin, Briefcase, X, Save } from 'lucide-react';
import { usersAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import './EmployeeManagement.css';

const EmployeeManagement = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        employeeId: '',
        username: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        profile: {
            firstName: '',
            lastName: '',
            phone: ''
        },
        employment: {
            designation: '',
            department: ''
        }
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const data = await usersAPI.getAll();
            if (data.success) {
                setEmployees(data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmployee = async () => {
        if (!newEmployee.employeeId || !newEmployee.username || !newEmployee.email || !newEmployee.password) {
            alert('Please fill all required fields');
            return;
        }
        try {
            const data = await authAPI.register(newEmployee);
            if (data.success) {
                alert('Employee added successfully');
                setShowAddModal(false);
                setNewEmployee({
                    employeeId: '',
                    username: '',
                    email: '',
                    password: '',
                    role: 'EMPLOYEE',
                    profile: { firstName: '', lastName: '', phone: '' },
                    employment: { designation: '', department: '' }
                });
                fetchEmployees();
            } else {
                alert(data.message || 'Failed to add employee');
            }
        } catch (error) {
            alert('Failed to add employee');
        }
    };

    const handleDeleteEmployee = async (id) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        try {
            const data = await usersAPI.delete(id);
            if (data.success) {
                fetchEmployees();
            } else {
                alert(data.message || 'Failed to delete employee');
            }
        } catch (error) {
            alert('Failed to delete employee');
        }
    };

    const getEmployeeName = (emp) => {
        if (emp.profile?.firstName) {
            return `${emp.profile.firstName} ${emp.profile.lastName || ''}`;
        }
        return emp.username;
    };

    const getAvatar = (emp) => {
        if (emp.profile?.firstName) {
            return `${emp.profile.firstName[0]}${emp.profile.lastName?.[0] || ''}`;
        }
        return emp.username.substring(0, 2).toUpperCase();
    };

    const filteredEmployees = employees.filter(emp => {
        const name = getEmployeeName(emp).toLowerCase();
        const role = (emp.employment?.designation || emp.role || '').toLowerCase();
        const department = (emp.employment?.department || '').toLowerCase();
        const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
            role.includes(searchTerm.toLowerCase()) ||
            department.includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' || emp.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'success';
            case 'On Leave': return 'warning';
            case 'Remote': return 'info';
            case 'Terminated': return 'danger';
            default: return 'success';
        }
    };

    if (loading) {
        return <div className="employee-container"><p>Loading employees...</p></div>;
    }

    const isAccountant = user?.role === ROLES.ACCOUNTANT;

    return (
        <div className="employee-container">
            <div className="emp-header">
                <div className="header-title">
                    <h2>Employee Directory</h2>
                    <p>Manage your workforce details and status</p>
                </div>
                {isAccountant && (
                    <button className="add-btn" onClick={() => setShowAddModal(true)}>
                        <Plus size={20} /> Add Employee
                    </button>
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add New Employee</h3>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <input type="text" placeholder="Employee ID *" value={newEmployee.employeeId} onChange={(e) => setNewEmployee({...newEmployee, employeeId: e.target.value})} />
                                <input type="text" placeholder="Username *" value={newEmployee.username} onChange={(e) => setNewEmployee({...newEmployee, username: e.target.value})} />
                            </div>
                            <div className="form-row">
                                <input type="email" placeholder="Email *" value={newEmployee.email} onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})} />
                                <input type="password" placeholder="Password *" value={newEmployee.password} onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})} />
                                <select value={newEmployee.role} onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}>
                                    <option value="EMPLOYEE">EMPLOYEE</option>
                                    <option value="INCUBATION_MANAGER">INCUBATION MANAGER</option>
                                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                                    <option value="OFFICER_IN_CHARGE">OFFICER IN CHARGE</option>
                                    <option value="FACULTY_IN_CHARGE">FACULTY IN CHARGE</option>
                                </select>
                            </div>
                            <div className="form-row">
                                <input type="text" placeholder="First Name" value={newEmployee.profile.firstName} onChange={(e) => setNewEmployee({...newEmployee, profile: {...newEmployee.profile, firstName: e.target.value}})} />
                                <input type="text" placeholder="Last Name" value={newEmployee.profile.lastName} onChange={(e) => setNewEmployee({...newEmployee, profile: {...newEmployee.profile, lastName: e.target.value}})} />
                            </div>
                            <div className="form-row">
                                <input type="text" placeholder="Phone" value={newEmployee.profile.phone} onChange={(e) => setNewEmployee({...newEmployee, profile: {...newEmployee.profile, phone: e.target.value}})} />
                                <input type="text" placeholder="Designation" value={newEmployee.employment.designation} onChange={(e) => setNewEmployee({...newEmployee, employment: {...newEmployee.employment, designation: e.target.value}})} />
                            </div>
                            {/* <div className="form-row">
                                <input type="text" placeholder="Department" value={newEmployee.employment.department} onChange={(e) => setNewEmployee({...newEmployee, employment: {...newEmployee.employment, department: e.target.value}})} />
                            </div> */}
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="save-btn" onClick={handleAddEmployee}><Save size={18} /> Save Employee</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="emp-controls">
                <div className="search-bar">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-dropdown">
                    <Filter size={20} className="filter-icon" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Remote">Remote</option>
                    </select>
                </div>
            </div>

            <div className="emp-grid">
                {filteredEmployees.length === 0 ? (
                    <p className="no-employees">No employees found</p>
                ) : filteredEmployees.map(emp => (
                    <div key={emp._id} className="emp-card glass-panel">
                        <div className="card-top">
                            <div className={`status-dot ${getStatusColor(emp.status || 'Active')}`} title={emp.status || 'Active'}></div>
                            <button className="more-btn" onClick={() => handleDeleteEmployee(emp._id)}><MoreVertical size={18} /></button>
                        </div>

                        <div className="emp-profile">
                            <div className="emp-avatar">
                                <span>{getAvatar(emp)}</span>
                            </div>
                            <h3>{getEmployeeName(emp)}</h3>
                            <span className="emp-role">{emp.employment?.designation || emp.role}</span>
                        </div>

                        <div className="emp-details">
                            <div className="detail-row">
                                <Briefcase size={16} />
                                <span>{emp.employment?.department || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <Mail size={16} />
                                <span>{emp.email}</span>
                            </div>
                            <div className="detail-row">
                                <Phone size={16} />
                                <span>{emp.profile?.phone || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <MapPin size={16} />
                                <span>Joined: {emp.employment?.joiningDate ? new Date(emp.employment.joiningDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>

                        <div className="card-actions">
                            <button className="view-btn">View Profile</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmployeeManagement;
