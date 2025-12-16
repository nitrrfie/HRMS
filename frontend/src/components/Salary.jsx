import { useState, useEffect, useRef } from 'react';
import { Save, Download } from 'lucide-react';
import { usersAPI } from '../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Salary.css';

const Salary = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchName, setSearchName] = useState('');
    const contentRef = useRef(null);

    // Get current month and year
    const currentDate = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await usersAPI.getAll();
                if (response.success && response.users) {
                    const filteredUsers = response.users.filter(
                        user => user.role !== 'FACULTY_IN_CHARGE' && user.role !== 'OFFICER_IN_CHARGE'
                    );
                    
                    const employeesWithSalary = filteredUsers.map(user => ({
                        id: user._id,
                        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.username,
                        designation: user.employment?.designation || 'N/A',
                        employeeId: user.employeeId || 'N/A',
                        pan: user.documents?.pan?.number || (typeof user.documents?.pan === 'string' ? user.documents.pan : 'N/A'),
                        bankAccount: user.bankDetails?.accountNumber || 'N/A',
                        fixedPay: user.employment?.baseSalary || 24000,
                        variablePay: user.employment?.maxVariableRemuneration || 6000,
                        others: 0,
                        tds: 0,
                        nps: 0,
                        otherDeductions: 0
                    }));

                    setEmployees(employeesWithSalary);
                }
            } catch (error) {
                console.error('Failed to fetch employees:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            setSearchName(selectedEmployee.name);
        }
    }, [selectedEmployee]);

    const handleNameChange = (e) => {
        const value = e.target.value;
        setSearchName(value);
    };

    const handleCheckEmployee = () => {
        const emp = employees.find(emp => emp.name.toLowerCase() === searchName.toLowerCase());
        if (emp) {
            setSelectedEmployee(emp);
        } else {
            setSelectedEmployee(null);
            alert('Employee not found. Please select from the suggestions.');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleCheckEmployee();
        }
    };

    const handleFieldChange = (field, value) => {
        const numValue = value === "" ? 0 : parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return;

        setSelectedEmployee(prev => ({
            ...prev,
            [field]: numValue
        }));
    };

    const calculateGrossSalary = () => {
        if (!selectedEmployee) return 0;
        return (selectedEmployee.fixedPay || 0) + 
               (selectedEmployee.variablePay || 0) + 
               (selectedEmployee.others || 0);
    };

    const calculateTotalDeductions = () => {
        if (!selectedEmployee) return 0;
        return (selectedEmployee.tds || 0) + 
               (selectedEmployee.nps || 0) + 
               (selectedEmployee.otherDeductions || 0);
    };

    const calculateNetSalary = () => {
        return calculateGrossSalary() - calculateTotalDeductions();
    };

    const handleSave = async () => {
        if (!selectedEmployee) return;
        
        setSaving(true);
        try {
            setEmployees(employees.map(emp => 
                emp.id === selectedEmployee.id ? selectedEmployee : emp
            ));
            alert('Salary data saved successfully!');
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save data. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!contentRef.current || !selectedEmployee) return;

        const actionsDiv = document.querySelector('.salary-actions');
        const employeeSelector = document.querySelector('.employee-selector');
        
        if (actionsDiv) actionsDiv.style.display = 'none';
        if (employeeSelector) employeeSelector.style.display = 'none';

        const originalStyle = {
            width: contentRef.current.style.width,
            maxWidth: contentRef.current.style.maxWidth,
            overflow: contentRef.current.style.overflow
        };

        contentRef.current.style.width = 'fit-content';
        contentRef.current.style.maxWidth = 'none';
        contentRef.current.style.overflow = 'visible';

        setTimeout(() => {
            html2canvas(contentRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: contentRef.current.scrollWidth,
                windowHeight: contentRef.current.scrollHeight
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`Salary_Slip_${selectedEmployee.name}_${currentMonth}_${currentYear}.pdf`);

                if (actionsDiv) actionsDiv.style.display = 'flex';
                if (employeeSelector) employeeSelector.style.display = 'block';
                contentRef.current.style.width = originalStyle.width;
                contentRef.current.style.maxWidth = originalStyle.maxWidth;
                contentRef.current.style.overflow = originalStyle.overflow;
            }).catch(err => {
                console.error('PDF generation failed:', err);
                if (actionsDiv) actionsDiv.style.display = 'flex';
                if (employeeSelector) employeeSelector.style.display = 'block';
                contentRef.current.style.width = originalStyle.width;
                contentRef.current.style.maxWidth = originalStyle.maxWidth;
                contentRef.current.style.overflow = originalStyle.overflow;
            });
        }, 100);
    };

    if (loading) {
        return <div className="salary-container"><div className="loading">Loading employees...</div></div>;
    }

    if (employees.length === 0) {
        return <div className="salary-container"><div className="no-data">No employees found</div></div>;
    }

    return (
        <div className="salary-page-container">
            <div className="salary-actions">
                <div className="employee-selector">
                    <label>Enter Employee Name:</label>
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            list="employees"
                            value={searchName}
                            onChange={handleNameChange}
                            onKeyPress={handleKeyPress}
                            placeholder="Type or select employee name..."
                            className="employee-search-input"
                        />
                        <button 
                            className="check-btn"
                            onClick={handleCheckEmployee}
                            title="Check Employee"
                        >
                            ✓
                        </button>
                    </div>
                    <datalist id="employees">
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.name} />
                        ))}
                    </datalist>
                </div>
                <div className="action-buttons">
                    <button
                        className="action-btn save-btn"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        className="action-btn download-btn"
                        onClick={handleDownloadPDF}
                    >
                        <Download size={18} />
                        Download PDF
                    </button>
                </div>
            </div>

            {!selectedEmployee && <div className="no-selection">Please enter an employee name to view the salary slip.</div>}

            {selectedEmployee && (
                <div className="salary-slip-container" ref={contentRef}>
                    <div className="slip-header">
                        <div className="logo-section">
                            <div className="logo-placeholder">LOGO</div>
                        </div>
                        <div className="organization-info">
                            <h3 className="hindi-title">एन.आई.टी. रायपुर फाउंडेशन फॉरइनोवेशन एंड आंत्रप्रन्योरशिप</h3>
                            <h2 className="org-name">NIT Raipur Foundation for Innovation & Entrepreneurship</h2>
                            <p className="org-subtitle">(A Technology Business Incubator & Not-for-profit Company governed by Section-8 of Companies Act 2013)</p>
                            <p className="org-address">National Institute of Technology Raipur, G.E. Road, Raipur - 492010, C.G.</p>
                            <div className="org-contact">
                                <span>Website: www.nitrrfie.in</span>
                                <span>Email: nitrrfie@nitrr.ac.in</span>
                            </div>
                        </div>
                        <div className="logo-section">
                            <div className="logo-placeholder">LOGO</div>
                        </div>
                    </div>

                    <div className="slip-title">Pay Slip</div>

                    <table className="info-table">
                        <tbody>
                            <tr>
                                <td className="label-cell"><strong>Name of Employee:</strong></td>
                                <td className="value-cell">{selectedEmployee.name}</td>
                                <td className="label-cell"><strong>Month:</strong></td>
                                <td className="value-cell">{currentMonth.substring(0, 3)}-{currentYear.toString().substring(2)}</td>
                            </tr>
                            <tr>
                                <td className="label-cell"><strong>Designation:</strong></td>
                                <td className="value-cell">{selectedEmployee.designation}</td>
                                <td className="label-cell"><strong>PAN No:</strong></td>
                                <td className="value-cell">{selectedEmployee.pan}</td>
                            </tr>
                            <tr>
                                <td className="label-cell"><strong>Employee ID:</strong></td>
                                <td className="value-cell">{selectedEmployee.employeeId}</td>
                                <td className="label-cell"><strong>Bank A/c. No.:</strong></td>
                                <td className="value-cell">{selectedEmployee.bankAccount}</td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="salary-table">
                        <thead>
                            <tr>
                                <th>Earnings</th>
                                <th>Amount (In Rs.)</th>
                                <th>Deductions</th>
                                <th>Amount (In Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Fixed Pay</td>
                                <td>
                                    <input
                                        type="number"
                                        className="editable-field"
                                        value={selectedEmployee.fixedPay}
                                        onChange={(e) => handleFieldChange('fixedPay', e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </td>
                                <td>TDS</td>
                                <td>
                                    <input
                                        type="number"
                                        className="editable-field"
                                        value={selectedEmployee.tds}
                                        onChange={(e) => handleFieldChange('tds', e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Variable Pay</td>
                                <td>
                                    <input
                                        type="number"
                                        className="editable-field"
                                        value={selectedEmployee.variablePay}
                                        onChange={(e) => handleFieldChange('variablePay', e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </td>
                                <td>NPS</td>
                                <td>
                                    <input
                                        type="number"
                                        className="editable-field"
                                        value={selectedEmployee.nps}
                                        onChange={(e) => handleFieldChange('nps', e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Others</td>
                                <td>
                                    <input
                                        type="number"
                                        className="editable-field"
                                        value={selectedEmployee.others}
                                        onChange={(e) => handleFieldChange('others', e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </td>
                                <td>Other Ded.</td>
                                <td>
                                    <input
                                        type="number"
                                        className="editable-field"
                                        value={selectedEmployee.otherDeductions}
                                        onChange={(e) => handleFieldChange('otherDeductions', e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </td>
                            </tr>
                            <tr className="total-row">
                                <td><strong>Gross Salary (In Rs.)</strong></td>
                                <td><strong>{calculateGrossSalary().toFixed(2)}</strong></td>
                                <td><strong>Total Ded. (In Rs.)</strong></td>
                                <td><strong>{calculateTotalDeductions().toFixed(2)}</strong></td>
                            </tr>
                            <tr className="net-salary-row">
                                <td colSpan="1"><strong>Net Salary (In Rs.)</strong></td>
                                <td colSpan="3"><strong>{calculateNetSalary().toFixed(2)}</strong></td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="signature-section">
                        <div className="signature-block">
                            <p className="signature-title">Accountant cum Admin.</p>
                            <p className="signature-org">NITRRFIE</p>
                        </div>
                        <div className="signature-block">
                            <p className="signature-title">Chief Executive Officer</p>
                            <p className="signature-org">NITRRFIE</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Salary;
