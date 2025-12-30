import { useState, useEffect, useRef } from "react";
import { Save, Download } from "lucide-react";
import { usersAPI, authAPI, attendanceAPI, leaveAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./Salary.css";
import { employeeRemunerationData } from "../data/employeeSalaryData";

const Salary = () => {
  const { user, canAccessFeature } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchName, setSearchName] = useState("");
  const contentRef = useRef(null);

  // Use database permissions
  const canViewAllSalaries = canAccessFeature("salary.viewAll");
  const canViewOwnSalary = canAccessFeature("salary.viewOwn");
  const canEditSalary = canAccessFeature("salary.edit");

  // Get current month and year
  const currentDate = new Date();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const [attendanceData, setAttendanceData] = useState({});
  const [casualLeaveData, setCasualLeaveData] = useState({});
  const [attendanceHalfDays, setAttendanceHalfDays] = useState({});
  const [totalWeekendDays, setTotalWeekendDays] = useState(0);
  const [currentMonthHolidays, setCurrentMonthHolidays] = useState(0);
  const [totalDaysInMonth, setTotalDaysInMonth] = useState(0);

  // Calculate month data
  useEffect(() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Calculate total days in month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    setTotalDaysInMonth(daysInMonth);

    // Calculate weekend days
    let weekendCount = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCount++;
      }
    }
    setTotalWeekendDays(weekendCount);

    // Set holidays (same logic as Remuneration.jsx)
    const month_per_holiday = {
      Jan: 1,
      Mar: 3,
      Apr: 1,
      May: 2,
      Jun: 1,
      Aug: 2,
      Sept: 2,
      Oct: 2,
      Nov: 2,
      Dec: 1,
    };
    const monthAbbreviations = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sept",
      "Oct",
      "Nov",
      "Dec",
    ];
    const currentMonthAbbr = monthAbbreviations[currentMonth];
    setCurrentMonthHolidays(month_per_holiday[currentMonthAbbr] || 0);
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        if (canViewAllSalaries) {
          // Can see all employees
          const response = await usersAPI.getAll();
          if (response.success && response.users) {
            const filteredUsers = response.users.filter(
              (user) =>
                user.role !== "FACULTY_IN_CHARGE" &&
                user.role !== "OFFICER_IN_CHARGE"
            );

            const employeesWithSalary = filteredUsers.map((user) => {
              const employeeId = user.employeeId || "N/A";
              // Get remuneration data from the shared data file
              const remunerationData = employeeRemunerationData[employeeId];

              return {
                id: user._id,
                name:
                  `${user.profile?.firstName || ""} ${
                    user.profile?.lastName || ""
                  }`.trim() || user.username,
                designation: user.employment?.designation || "N/A",
                employeeId: employeeId,
                pan:
                  user.documents?.pan?.number ||
                  (typeof user.documents?.pan === "string"
                    ? user.documents.pan
                    : "N/A"),
                bankAccount: user.bankDetails?.accountNumber || "N/A",
                // Use data from employeeRemunerationData if available, otherwise fallback
                fixedPay:
                  remunerationData?.fixedRemuneration ||
                  user.employment?.baseSalary ||
                  24000,
                variablePay:
                  remunerationData?.variableRemuneration ||
                  user.employment?.maxVariableRemuneration ||
                  6000,
                others: 0,
                tds: 0,
                nps: 0,
                otherDeductions: 0,
              };
            });

            setEmployees(employeesWithSalary);
          }
        } else if (canViewOwnSalary || !canViewAllSalaries) {
          // Regular employee can only see their own salary
          const response = await authAPI.getProfile();
          if (response.success && response.user) {
            const currentUser = response.user;
            const employeeId = currentUser.employeeId || "N/A";
            // Get remuneration data from the shared data file
            const remunerationData = employeeRemunerationData[employeeId];

            const employeeData = {
              id: currentUser._id,
              name:
                `${currentUser.profile?.firstName || ""} ${
                  currentUser.profile?.lastName || ""
                }`.trim() || currentUser.username,
              designation: currentUser.employment?.designation || "N/A",
              employeeId: employeeId,
              pan:
                currentUser.documents?.pan?.number ||
                (typeof currentUser.documents?.pan === "string"
                  ? currentUser.documents.pan
                  : "N/A"),
              bankAccount: currentUser.bankDetails?.accountNumber || "N/A",
              // Use data from employeeRemunerationData if available, otherwise fallback
              fixedPay:
                remunerationData?.fixedRemuneration ||
                currentUser.employment?.baseSalary ||
                24000,
              variablePay:
                remunerationData?.variableRemuneration ||
                currentUser.employment?.maxVariableRemuneration ||
                6000,
              others: 0,
              tds: 0,
              nps: 0,
              otherDeductions: 0,
            };
            setEmployees([employeeData]);
            setSelectedEmployee(employeeData);
            setSearchName(employeeData.name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [canViewAllSalaries, canViewOwnSalary]);

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
    const emp = employees.find(
      (emp) => emp.name.toLowerCase() === searchName.toLowerCase()
    );
    if (emp) {
      setSelectedEmployee(emp);
    } else {
      setSelectedEmployee(null);
      alert("Employee not found. Please select from the suggestions.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleCheckEmployee();
    }
  };

  const handleFieldChange = (field, value) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setSelectedEmployee((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const calculateGrossSalary = () => {
    if (!selectedEmployee) return 0;
    return (
      (selectedEmployee.fixedPay || 0) +
      (selectedEmployee.variablePay || 0) +
      (selectedEmployee.others || 0)
    );
  };

  const calculateTotalDeductions = () => {
    if (!selectedEmployee) return 0;
    return (
      (selectedEmployee.tds || 0) +
      (selectedEmployee.nps || 0) +
      (selectedEmployee.otherDeductions || 0)
    );
  };

  // Add the calculateNetPayable function
  const calculateNetPayable = () => {
    if (!selectedEmployee) return 0;

    const daysWorked = attendanceData[selectedEmployee.employeeId] || 0;
    const approvedLeaves = casualLeaveData[selectedEmployee.employeeId] || 0;
    const halfDays = attendanceHalfDays[selectedEmployee.employeeId] || 0;
    const casualLeave = approvedLeaves + halfDays * 0.5;

    const netPayableDays =
      daysWorked + casualLeave + totalWeekendDays + currentMonthHolidays;

    const employeeId = selectedEmployee.employeeId;
    const remunerationData = employeeRemunerationData[employeeId];
    const grossRemuneration =
      remunerationData?.grossRemuneration ||
      selectedEmployee.fixedPay + selectedEmployee.variablePay;

    if (totalDaysInMonth === 0) return 0;
    const netPayable = (grossRemuneration / totalDaysInMonth) * netPayableDays;

    return netPayable.toFixed(2);
  };

  // Update the calculateNetSalary function to use calculateNetPayable
  const calculateNetSalary = () => {
    // Use the calculated net payable from remuneration logic
    const netPayable = parseFloat(calculateNetPayable());
    const deductions = calculateTotalDeductions();
    return (netPayable - deductions).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      setEmployees(
        employees.map((emp) =>
          emp.id === selectedEmployee.id ? selectedEmployee : emp
        )
      );
      alert("Salary data saved successfully!");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!contentRef.current || !selectedEmployee) return;

    const actionsDiv = document.querySelector(".salary-actions");
    const employeeSelector = document.querySelector(".employee-selector");

    if (actionsDiv) actionsDiv.style.display = "none";
    if (employeeSelector) employeeSelector.style.display = "none";

    const originalStyle = {
      width: contentRef.current.style.width,
      maxWidth: contentRef.current.style.maxWidth,
      overflow: contentRef.current.style.overflow,
    };

    contentRef.current.style.width = "fit-content";
    contentRef.current.style.maxWidth = "none";
    contentRef.current.style.overflow = "visible";

    setTimeout(() => {
      html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight,
      })
        .then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({
            orientation: "p",
            unit: "px",
            format: [canvas.width, canvas.height],
          });

          pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
          pdf.save(
            `Salary_Slip_${selectedEmployee.name}_${currentMonth}_${currentYear}.pdf`
          );

          if (actionsDiv) actionsDiv.style.display = "flex";
          if (employeeSelector) employeeSelector.style.display = "block";
          contentRef.current.style.width = originalStyle.width;
          contentRef.current.style.maxWidth = originalStyle.maxWidth;
          contentRef.current.style.overflow = originalStyle.overflow;
        })
        .catch((err) => {
          console.error("PDF generation failed:", err);
          if (actionsDiv) actionsDiv.style.display = "flex";
          if (employeeSelector) employeeSelector.style.display = "block";
          contentRef.current.style.width = originalStyle.width;
          contentRef.current.style.maxWidth = originalStyle.maxWidth;
          contentRef.current.style.overflow = originalStyle.overflow;
        });
    }, 100);
  };

  useEffect(() => {
    const fetchAttendanceAndLeaves = async () => {
      if (!selectedEmployee) return;

      try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        // Fetch attendance
        const attendanceResponse = await fetch(
          `http://localhost:5000/api/attendance/user/${
            selectedEmployee.id
          }?month=${currentMonth + 1}&year=${currentYear}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const attendanceData = await attendanceResponse.json();

        if (attendanceData.success) {
          const presentCount = attendanceData.attendance.filter(
            (a) => a.status === "present" || a.status === "late"
          ).length;
          const halfCount = attendanceData.attendance.filter(
            (a) => a.status === "half-day"
          ).length;

          setAttendanceData({
            [selectedEmployee.employeeId]: presentCount + halfCount * 0.5,
          });
          setAttendanceHalfDays({
            [selectedEmployee.employeeId]: halfCount,
          });
        }

        // Fetch leaves
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const leavesResponse = await leaveAPI.getAll("approved");

        if (leavesResponse.success && leavesResponse.leaves) {
          let casualLeave = 0;

          leavesResponse.leaves.forEach((leave) => {
            if (
              leave.user?._id === selectedEmployee.id ||
              leave.user === selectedEmployee.id
            ) {
              const leaveStart = new Date(leave.startDate);
              const leaveEnd = new Date(leave.endDate);

              if (leaveStart <= endOfMonth && leaveEnd >= startOfMonth) {
                const overlapStart =
                  leaveStart > startOfMonth ? leaveStart : startOfMonth;
                const overlapEnd =
                  leaveEnd < endOfMonth ? leaveEnd : endOfMonth;
                const daysDiff =
                  Math.ceil(
                    (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)
                  ) + 1;

                if (leave.leaveType === "Casual Leave") {
                  casualLeave += daysDiff;
                }
              }
            }
          });

          setCasualLeaveData({
            [selectedEmployee.employeeId]: casualLeave,
          });
        }
      } catch (error) {
        console.error("Failed to fetch attendance/leave data:", error);
      }
    };

    fetchAttendanceAndLeaves();
  }, [selectedEmployee]);

  if (loading) {
    return (
      <div className="salary-container">
        <div className="loading">Loading employees...</div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="salary-container">
        <div className="no-data">No employees found</div>
      </div>
    );
  }

  return (
    <div className="salary-page-container">
      {canViewAllSalaries && (
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
              {employees.map((emp) => (
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
              {saving ? "Saving..." : "Save"}
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
      )}

      {!canViewAllSalaries && selectedEmployee && (
        <div className="salary-actions">
          <div className="action-buttons">
            <button
              className="action-btn download-btn"
              onClick={handleDownloadPDF}
            >
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>
      )}

      {canViewAllSalaries && !selectedEmployee && (
        <div className="no-selection">
          Please enter an employee name to view the salary slip.
        </div>
      )}

      {selectedEmployee && (
        <div className="salary-slip-container" ref={contentRef}>
          <div className="slip-header">
            <div className="logo-section">
              <img
                src="/National_Institute_of_Technology,_Raipur_Logo.png"
                alt="NIT Raipur"
                class="logo-left-salary"
              />
            </div>
            <div className="organization-info">
              <h3 className="hindi-title">
                एन.आई.टी. रायपुर फाउंडेशन फॉरइनोवेशन एंड आंत्रप्रन्योरशिप
              </h3>
              <h2 className="org-name">
                NIT Raipur Foundation for Innovation & Entrepreneurship
              </h2>
              <p className="org-subtitle">
                (A Technology Business Incubator & Not-for-profit Company
                governed by Section-8 of Companies Act 2013)
              </p>
              <p className="org-address">
                National Institute of Technology Raipur, G.E. Road, Raipur -
                492010, C.G.
              </p>
              <div className="org-contact">
                <span>Website: www.nitrrfie.in</span>
                <span>Email: nitrrfie@nitrr.ac.in</span>
              </div>
            </div>
            <div className="logo-section">
              <img
                src="/logo-NITRRFIE.png"
                alt="NITRRFIE"
                class="logo-right-salary"
              />
            </div>
          </div>

          <div className="slip-title">Pay Slip</div>

          <table className="info-table">
            <tbody>
              <tr>
                <td className="label-cell">
                  <strong>Name of Employee:</strong>
                </td>
                <td className="value-cell">{selectedEmployee.name}</td>
                <td className="label-cell">
                  <strong>Month:</strong>
                </td>
                <td className="value-cell">
                  {currentMonth.substring(0, 3)}-
                  {currentYear.toString().substring(2)}
                </td>
              </tr>
              <tr>
                <td className="label-cell">
                  <strong>Designation:</strong>
                </td>
                <td className="value-cell">{selectedEmployee.designation}</td>
                <td className="label-cell">
                  <strong>PAN No:</strong>
                </td>
                <td className="value-cell">{selectedEmployee.pan}</td>
              </tr>
              <tr>
                <td className="label-cell">
                  <strong>Employee ID:</strong>
                </td>
                <td className="value-cell">{selectedEmployee.employeeId}</td>
                <td className="label-cell">
                  <strong>Bank A/c. No.:</strong>
                </td>
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
                  {canEditSalary ? (
                    <input
                      type="number"
                      className="editable-field"
                      value={selectedEmployee.fixedPay}
                      onChange={(e) =>
                        handleFieldChange("fixedPay", e.target.value)
                      }
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="readonly-field">
                      {selectedEmployee.fixedPay.toFixed(2)}
                    </span>
                  )}
                </td>
                <td>TDS</td>
                <td>
                  {canEditSalary ? (
                    <input
                      type="number"
                      className="editable-field"
                      value={selectedEmployee.tds}
                      onChange={(e) => handleFieldChange("tds", e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="readonly-field">
                      {selectedEmployee.tds.toFixed(2)}
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td>Variable Pay</td>
                <td>
                  {canEditSalary ? (
                    <input
                      type="number"
                      className="editable-field"
                      value={selectedEmployee.variablePay}
                      onChange={(e) =>
                        handleFieldChange("variablePay", e.target.value)
                      }
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="readonly-field">
                      {selectedEmployee.variablePay.toFixed(2)}
                    </span>
                  )}
                </td>
                <td>NPS</td>
                <td>
                  {canEditSalary ? (
                    <input
                      type="number"
                      className="editable-field"
                      value={selectedEmployee.nps}
                      onChange={(e) => handleFieldChange("nps", e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="readonly-field">
                      {selectedEmployee.nps.toFixed(2)}
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td>Others</td>
                <td>
                  {canEditSalary ? (
                    <input
                      type="number"
                      className="editable-field"
                      value={selectedEmployee.others}
                      onChange={(e) =>
                        handleFieldChange("others", e.target.value)
                      }
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="readonly-field">
                      {selectedEmployee.others.toFixed(2)}
                    </span>
                  )}
                </td>
                <td>Other Ded.</td>
                <td>
                  {canEditSalary ? (
                    <input
                      type="number"
                      className="editable-field"
                      value={selectedEmployee.otherDeductions}
                      onChange={(e) =>
                        handleFieldChange("otherDeductions", e.target.value)
                      }
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <span className="readonly-field">
                      {selectedEmployee.otherDeductions.toFixed(2)}
                    </span>
                  )}
                </td>
              </tr>
              <tr className="total-row">
                <td>
                  <strong>Gross Salary (In Rs.)</strong>
                </td>
                <td>
                  <strong>{calculateGrossSalary().toFixed(2)}</strong>
                </td>
                <td>
                  <strong>Total Ded. (In Rs.)</strong>
                </td>
                <td>
                  <strong>{calculateTotalDeductions().toFixed(2)}</strong>
                </td>
              </tr>
              <tr className="net-salary-row">
                <td colSpan="1">
                  <strong>Net Salary (In Rs.)</strong>
                </td>
                <td colSpan="3">
                  <strong>{calculateNetSalary()}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="signature-section">
            <div className="signature-block">
              <p className="signature-title">This is a Computer Generated Salary Slip. Does not Require any Signature.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
