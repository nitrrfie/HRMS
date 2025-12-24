import { useState, useRef, useEffect } from "react";
import "./Remuneration.css";
import { useAuth } from "../context/AuthContext";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Save } from "lucide-react";
import { usersAPI, attendanceAPI, leaveAPI } from "../services/api";

const Remuneration = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const contentRef = useRef(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [casualLeaveData, setCasualLeaveData] = useState({});
  const [lwpData, setLwpData] = useState({});
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const isFacultyInCharge = user?.role === "FACULTY_IN_CHARGE";

  // Current month and year
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

  // Calculate total days in current month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  const totalDaysInMonth = getDaysInMonth(currentYear, currentDate.getMonth());

  // Calculate total weekend days (Saturdays and Sundays) in current month
  const getWeekendDaysInMonth = (year, month) => {
    const daysInMonth = getDaysInMonth(year, month);
    let weekendCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month, day).getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCount++;
      }
    }

    return weekendCount;
  };
  const totalWeekendDays = getWeekendDaysInMonth(
    currentYear,
    currentDate.getMonth()
  );

  // Fetch attendance data for all employees on mount
  useEffect(() => {
    fetchAllEmployeesAttendance();
    fetchAllEmployeesLeaves();
  }, [currentMonth, currentYear]);

  const fetchAllEmployeesAttendance = async () => {
    setLoadingAttendance(true);
    try {
      // Fetch all users first
      const usersResponse = await usersAPI.getAll();

      if (usersResponse.success && usersResponse.users) {
        // For each user, fetch their attendance for current month
        const attendancePromises = usersResponse.users.map(async (userData) => {
          try {
            const response = await fetch(
              `http://localhost:5000/api/attendance/user/${
                userData._id
              }?month=${currentDate.getMonth() + 1}&year=${currentYear}`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );
            const data = await response.json();

            if (data.success) {
              // Count present and late days
              const presentDays = data.attendance.filter(
                (a) => a.status === "present" || a.status === "late"
              ).length;

              return {
                userId: userData._id,
                employeeId: userData.employeeId,
                presentDays,
              };
            }
            return {
              userId: userData._id,
              employeeId: userData.employeeId,
              presentDays: 0,
            };
          } catch (error) {
            console.error(
              `Failed to fetch attendance for user ${userData._id}:`,
              error
            );
            return {
              userId: userData._id,
              employeeId: userData.employeeId,
              presentDays: 0,
            };
          }
        });

        const attendanceResults = await Promise.all(attendancePromises);

        // Create a map of employeeId to presentDays
        const attendanceMap = {};
        attendanceResults.forEach((result) => {
          attendanceMap[result.employeeId] = result.presentDays;
        });

        setAttendanceData(attendanceMap);
      }
    } catch (error) {
      console.error("Failed to fetch attendance data:", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchAllEmployeesLeaves = async () => {
    setLoadingLeaves(true);
    try {
      // Fetch all users first
      const usersResponse = await usersAPI.getAll();

      if (usersResponse.success && usersResponse.users) {
        // Get start and end of current month
        const startOfMonth = new Date(currentYear, currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentYear, currentDate.getMonth() + 1, 0);

        // Fetch all approved leaves
        const leavesResponse = await leaveAPI.getAll("approved");

        if (leavesResponse.success && leavesResponse.leaves) {
          // Create maps for both casual leave and LWP
          const casualLeaveMap = {};
          const lwpMap = {};

          // Initialize all users with 0 days
          usersResponse.users.forEach((userData) => {
            casualLeaveMap[userData.employeeId] = 0;
            lwpMap[userData.employeeId] = 0;
          });

          // Calculate leave days for each user
          leavesResponse.leaves.forEach((leave) => {
            if (leave.user) {
              const leaveStart = new Date(leave.startDate);
              const leaveEnd = new Date(leave.endDate);

              // Check if leave overlaps with current month
              if (leaveStart <= endOfMonth && leaveEnd >= startOfMonth) {
                // Find user's employeeId
                const userData = usersResponse.users.find(
                  (u) => u._id === leave.user._id || u._id === leave.user
                );
                if (userData && userData.employeeId) {
                  // Calculate days in current month
                  const overlapStart =
                    leaveStart > startOfMonth ? leaveStart : startOfMonth;
                  const overlapEnd =
                    leaveEnd < endOfMonth ? leaveEnd : endOfMonth;

                  const daysDiff =
                    Math.ceil(
                      (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)
                    ) + 1;

                  // Add to appropriate map based on leave type
                  if (leave.leaveType === "Casual Leave") {
                    casualLeaveMap[userData.employeeId] += daysDiff;
                  } else if (leave.leaveType === "Leave Without Pay") {
                    lwpMap[userData.employeeId] += daysDiff;
                  }
                }
              }
            }
          });

          setCasualLeaveData(casualLeaveMap);
          setLwpData(lwpMap);
        }
      }
    } catch (error) {
      console.error("Failed to fetch leave data:", error);
    } finally {
      setLoadingLeaves(false);
    }
  };

  // Sample employee data - attendance columns left blank for current month
  const [employees, setEmployees] = useState([
    {
      id: 1,
      employeeId: "NITR-CEO-001",
      name: "Mr. Medha Singh",
      designation: "Chief Executive Officer",
      dateOfJoining: "15-07-2025",
      grossRemuneration: 80000,
      daysWorked: "",
      casualLeave: "",
      weeklyOff: "",
      holidays: "",
      lwpDays: "",
      totalDays: "",
      payableDays: "",
      fixedRemuneration: 64000.0,
      variableRemuneration: 16000.0,
      totalRemuneration: 80000.0,
      tds: 0.0,
      otherDeduction: 0.0,
      netPayable: 80000.0,
      panBankDetails:
        "PAN: BHRPS4064A\nBANK: IDBI Bank,\nCivil Lines, Raipur\nA/C: 0495104000146716\nIFSC:IBKL0000495",
    },
    {
      id: 2,
      employeeId: "NITR-MGR-001",
      name: "Mr. Sunil Dewangan",
      designation: "Incubation Manager",
      dateOfJoining: "10/9/2025",
      grossRemuneration: 54000,
      daysWorked: "",
      casualLeave: "",
      weeklyOff: "",
      holidays: "",
      lwpDays: "",
      totalDays: "",
      payableDays: "",
      fixedRemuneration: 43200.0,
      variableRemuneration: 10800.0,
      totalRemuneration: 54000.0,
      tds: 0.0,
      otherDeduction: 0.0,
      netPayable: 54000.0,
      panBankDetails:
        "PAN: BJZPD0141A\nBANK: State Bank of India,\nCamp Area Bhilai,\nNear Power House, Bhilai\nA/C: 38072524817\nIFSC: SBIN0009154",
    },
    {
      id: 3,
      employeeId: "NITR-ACC-001",
      name: "Mr. Ashok Sahu",
      designation: "Accountant Cum Administrator",
      dateOfJoining: "30/9/25",
      grossRemuneration: 32400,
      daysWorked: "",
      casualLeave: "",
      weeklyOff: "",
      holidays: "",
      lwpDays: "",
      totalDays: "",
      payableDays: "",
      fixedRemuneration: 25920.0,
      variableRemuneration: 6480.0,
      totalRemuneration: 32400.0,
      tds: 0.0,
      otherDeduction: 0.0,
      netPayable: 32400.0,
      panBankDetails:
        "PAN: BCPPA5763A\nBANK: State Bank of India,\nTelibandha GE Road, Near\nRailway Crossing\nA/C: 30174860333\nIFSC: SBIN0005194",
    },
    {
      id: 4,
      employeeId: "EMP004",
      name: "Mr. Himanshu Verma",
      designation: "Support Staff",
      dateOfJoining: "18/10/25",
      grossRemuneration: 10000,
      daysWorked: "",
      casualLeave: "",
      weeklyOff: "",
      holidays: "",
      lwpDays: "",
      totalDays: "",
      payableDays: "",
      fixedRemuneration: 8000.0,
      variableRemuneration: 2000.0,
      totalRemuneration: 10000.0,
      tds: 0.0,
      otherDeduction: 0.0,
      netPayable: 10000.0,
      panBankDetails:
        "PAN: CUTPV9394L\nBANK: State Bank of India,\nNesta, Tilda\nA/C: 39634349811\nIFSC: SBIN0001470",
    },
    {
      id: 5,
      employeeId: "EMP005",
      name: "Mr. Naresh Kumar",
      designation: "Hardware Maintenance Engineer",
      dateOfJoining: "24/11/24",
      grossRemuneration: 25000,
      daysWorked: "",
      casualLeave: "",
      weeklyOff: "",
      holidays: "",
      lwpDays: "",
      totalDays: "",
      payableDays: "",
      fixedRemuneration: 20000.0,
      variableRemuneration: 5000.0,
      totalRemuneration: 25000.0,
      tds: 0.0,
      otherDeduction: 0.0,
      netPayable: 25000.0,
      panBankDetails:
        "PAN: BSVPK8707R\nBANK: Union Bank of India,\nBorsi, Durg\nA/C: 747902010017132\nIFSC: UBIN0576708",
    },
  ]);

  const handleChange = (id, field, value) => {
    if (!isFacultyInCharge) return;
    setEmployees(
      employees.map((emp) => (emp.id === id ? { ...emp, [field]: value } : emp))
    );
  };

  const calculateTotals = () => {
    let totalVariable = 0;
    let totalTDS = 0;
    let totalOther = 0;
    let totalNetPayable = 0;

    employees.forEach((emp) => {
      totalVariable += parseFloat(emp.variableRemuneration) || 0;
      totalTDS += parseFloat(emp.tds) || 0;
      totalOther += parseFloat(emp.otherDeduction) || 0;
      totalNetPayable += parseFloat(emp.netPayable) || 0;
    });

    return { totalVariable, totalTDS, totalOther, totalNetPayable };
  };

  const handleSave = async () => {
    if (!isFacultyInCharge) return;
    setSaving(true);
    try {
      // Placeholder - backend to be implemented later
      alert("Remuneration data saved successfully!");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!contentRef.current) return;

    const actionsDiv = document.querySelector(".remuneration-actions");
    if (actionsDiv) actionsDiv.style.display = "none";

    const originalStyle = {
      width: contentRef.current.style.width,
      maxWidth: contentRef.current.style.maxWidth,
      overflow: contentRef.current.style.overflow,
    };

    const tableContainer = contentRef.current.querySelector(".table-container");
    const originalTableStyle = {
      overflow: tableContainer ? tableContainer.style.overflow : "",
      maxWidth: tableContainer ? tableContainer.style.maxWidth : "",
    };

    contentRef.current.style.width = "fit-content";
    contentRef.current.style.maxWidth = "none";
    contentRef.current.style.overflow = "visible";

    if (tableContainer) {
      tableContainer.style.overflow = "visible";
      tableContainer.style.maxWidth = "none";
    }

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
            orientation: "l",
            unit: "px",
            format: [canvas.width, canvas.height],
          });

          pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
          pdf.save(`Remuneration_${currentMonth}_${currentYear}.pdf`);

          if (actionsDiv) actionsDiv.style.display = "flex";
          contentRef.current.style.width = originalStyle.width;
          contentRef.current.style.maxWidth = originalStyle.maxWidth;
          contentRef.current.style.overflow = originalStyle.overflow;

          if (tableContainer) {
            tableContainer.style.overflow = originalTableStyle.overflow;
            tableContainer.style.maxWidth = originalTableStyle.maxWidth;
          }
        })
        .catch((err) => {
          console.error("PDF generation failed:", err);
          if (actionsDiv) actionsDiv.style.display = "flex";
          contentRef.current.style.width = originalStyle.width;
          contentRef.current.style.maxWidth = originalStyle.maxWidth;
          contentRef.current.style.overflow = originalStyle.overflow;

          if (tableContainer) {
            tableContainer.style.overflow = originalTableStyle.overflow;
            tableContainer.style.maxWidth = originalTableStyle.maxWidth;
          }
        });
    }, 100);
  };

  const totals = calculateTotals();

  return (
    <div className="remuneration-page-container">
      <div className="remuneration-actions">
        {isFacultyInCharge && (
          <button
            className="action-btn save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Data"}
          </button>
        )}
        <button className="action-btn download-btn" onClick={handleDownloadPDF}>
          <Download size={18} />
          Download PDF
        </button>
      </div>

      <div className="remuneration-container" ref={contentRef}>
        <div className="remuneration-header">
          <h2>
            NIT Raipur Foundation for Innovation & Entrepreneurship (NITRR-FIE)
          </h2>
          <h3>
            Attendance Record of Contractual Employees for the Month{" "}
            <span className="highlight-date">
              {currentMonth} {currentYear}
            </span>
          </h3>
        </div>

        <div className="table-container">
          <table className="remuneration-table">
            <thead>
              <tr>
                <th>S. No.</th>
                <th>Name</th>
                <th>Designation / Engagement</th>
                <th>Date of Joining</th>
                <th>
                  Consolidated Gross Remuneration (per month)
                  <br />
                  [in Rs.]
                </th>
                <th>No. of days worked in Office</th>
                <th>No. of days Casual Leave availed (CL)</th>
                <th>No. of Admissible Weekly off Days</th>
                <th>No. of Payable National Holidays (if any)</th>
                <th>Total LWP No. of Days</th>
                <th>Total No. of Days</th>
                <th>Total No. of Payable Days</th>
                <th>
                  Fixed Remuneration (80% of Gross)
                  <br />
                  [in Rs.]
                </th>
                <th>
                  Variable Remuneration (20% of Gross)
                  <br />
                  [in Rs.]
                </th>
                <th>
                  Total Payable Remuneration
                  <br />
                  [in Rs.]
                </th>
                <th>
                  TDS Deducted
                  <br />
                  [in Rs.]
                </th>
                <th>
                  Other Deduction
                  <br />
                  [in Rs.]
                </th>
                <th>
                  Net Payable Remuneration
                  <br />
                  [in Rs.]
                </th>
                <th>PAN & Bank Details</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, index) => (
                <tr key={emp.id}>
                  <td>{index + 1}</td>
                  <td className="name-cell">{emp.name}</td>
                  <td className="designation-cell">{emp.designation}</td>
                  <td>{emp.dateOfJoining}</td>
                  <td>{emp.grossRemuneration?.toLocaleString()}/-</td>
                  <td>
                    {loadingAttendance ? (
                      <span className="loading-text">Loading...</span>
                    ) : attendanceData[emp.employeeId] !== undefined ? (
                      attendanceData[emp.employeeId]
                    ) : (
                      emp.daysWorked || 0
                    )}
                  </td>
                  <td>
                    {loadingLeaves ? (
                      <span className="loading-text">Loading...</span>
                    ) : casualLeaveData[emp.employeeId] !== undefined ? (
                      casualLeaveData[emp.employeeId]
                    ) : (
                      0
                    )}
                  </td>
                  <td>{totalWeekendDays}</td>
                  <td>19</td>
                  <td>
                    {loadingLeaves ? (
                      <span className="loading-text">Loading...</span>
                    ) : lwpData[emp.employeeId] !== undefined ? (
                      lwpData[emp.employeeId]
                    ) : (
                      0
                    )}
                  </td>
                  <td>{totalDaysInMonth}</td>
                  <td>{emp.payableDays}</td>
                  <td>
                    <input
                      type="number"
                      className="score-input wide-input"
                      value={emp.fixedRemuneration}
                      onChange={(e) =>
                        handleChange(
                          emp.id,
                          "fixedRemuneration",
                          e.target.value
                        )
                      }
                      disabled={!isFacultyInCharge}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="score-input wide-input"
                      value={emp.variableRemuneration}
                      onChange={(e) =>
                        handleChange(
                          emp.id,
                          "variableRemuneration",
                          e.target.value
                        )
                      }
                      disabled={!isFacultyInCharge}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="score-input wide-input"
                      value={emp.totalRemuneration}
                      onChange={(e) =>
                        handleChange(
                          emp.id,
                          "totalRemuneration",
                          e.target.value
                        )
                      }
                      disabled={!isFacultyInCharge}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="score-input"
                      value={emp.tds}
                      onChange={(e) =>
                        handleChange(emp.id, "tds", e.target.value)
                      }
                      disabled={!isFacultyInCharge}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="score-input"
                      value={emp.otherDeduction}
                      onChange={(e) =>
                        handleChange(emp.id, "otherDeduction", e.target.value)
                      }
                      disabled={!isFacultyInCharge}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="score-input wide-input"
                      value={emp.netPayable}
                      onChange={(e) =>
                        handleChange(emp.id, "netPayable", e.target.value)
                      }
                      disabled={!isFacultyInCharge}
                    />
                  </td>
                  <td className="pan-cell">
                    <pre>{emp.panBankDetails}</pre>
                  </td>
                </tr>
              ))}
              <tr className="totals-row">
                <td colSpan="13">
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>{totals.totalVariable.toFixed(2)}</strong>
                </td>
                <td></td>
                <td>
                  <strong>{totals.totalTDS.toFixed(2)}</strong>
                </td>
                <td>
                  <strong>{totals.totalOther.toFixed(2)}</strong>
                </td>
                <td>
                  <strong>{totals.totalNetPayable.toFixed(2)}</strong>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="certifications">
          <p>
            1) Certified that the above employee(s) have delivered their duty
            satisfactorily during the mentioned month.
          </p>
          <p>
            2) Certified that Approval of Competent Authority is available for
            deployment of above employees.
          </p>
          <p>
            3) Certified that the Balance amount of{" "}
            <strong>Rs. _______________</strong> is available on date under the
            Recurring Manpower Head (B.1) of the project.
          </p>
          <p>
            4) Forwarded for release of Remuneration to above employee(s)
            concerned from the above head.
          </p>
        </div>

        <div className="signature-section-full">
          <div className="signature">
            <p>
              <strong>Faculty In-Charge, Incubation Cell,</strong>
            </p>
            <p>NIT Raipur</p>
          </div>
          <div className="signature">
            <p>
              <strong>Board Director, NITRRFIE</strong>
            </p>
            <p>Head CDC, NIT Raipur</p>
          </div>
          <div className="signature">
            <p>
              <strong>Board Director, NITRRFIE</strong>
            </p>
            <p>Director, NIT Raipur</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Remuneration;
