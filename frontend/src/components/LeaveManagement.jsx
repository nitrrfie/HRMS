import { useState, useRef, useEffect } from "react";
import {
  Check,
  X,
  Clock,
  Calendar,
  FileText,
  User,
  Send,
  UserCheck,
  Printer,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { leaveAPI, usersAPI } from "../services/api";
import "./LeaveManagement.css";

const formatRole = (role) => {
  if (!role) return "N/A";
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const LeaveManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("apply");
  const formRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [myLeaves, setMyLeaves] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(
    user?.leaveBalance || {
      casualLeave: 0,
    }
  );
  const [availableUsers, setAvailableUsers] = useState([]);

  const leaveTypeToKey = {
    "Casual Leave": "casualLeave",
    "On Duty Leave": "onDutyLeave",
    "Leave Without Pay": "leaveWithoutPay",
  };

  const leaveTypeOptions = [
    "Casual Leave",
    "On Duty Leave",
    "Leave Without Pay",
  ];

  const [formData, setFormData] = useState({
    name: user?.profile?.firstName
      ? `${user.profile.firstName} ${user.profile.lastName || ""}`
      : user?.username || "",
    designation: user?.employment?.designation || "",
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    numberOfDays: "",
    contactNo: user?.profile?.phone || "",
    reason: "",
    reportingToId: "",
    reportingToName: "",
    personInCharge: "",
  });

  useEffect(() => {
    if (activeTab !== "requests") {
      fetchMyLeaves();
    }
    fetchPendingRequests();
  }, [activeTab]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getForPeerRating();
      if (data.success) {
        const currentUserId = user?.id;
        const users = (data.users || [])
          .filter((u) => String(u._id) !== String(currentUserId))
          .filter((u) => u.role !== "ADMIN")
          .map((u) => ({
            id: u._id,
            name: u?.profile?.firstName
              ? `${u.profile.firstName} ${u.profile.lastName || ""}`.trim()
              : u.username || "Unknown",
            role: formatRole(u.role), // Apply camel case formatting
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAvailableUsers(users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchMyLeaves = async () => {
    try {
      const data = await leaveAPI.getMy();
      if (data.success) {
        setMyLeaves(data.leaves || []);
        if (data.leaveBalance) setLeaveBalance(data.leaveBalance);
      }
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const data = await leaveAPI.getPending();
      if (data.success) {
        setPendingRequests(data.leaves || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending leaves:", error);
    }
  };

  const approvedAvailed = (() => {
    const totals = { casualLeave: 0, onDutyLeave: 0, leaveWithoutPay: 0 };
    for (const leave of myLeaves || []) {
      if (leave?.status !== "approved") continue;
      const key = leaveTypeToKey[leave.leaveType];
      if (!key) continue;
      totals[key] += Number(leave.numberOfDays || 0);
    }
    return totals;
  })();

  // Leave policy:
  // - Casual Leave has a limited entitlement (leaveBalance.casualLeave)
  // - On Duty Leave and Leave Without Pay are unlimited
  const casualEntitlement = Number(leaveBalance?.casualLeave ?? 0);
  const casualRemaining = Math.max(
    casualEntitlement - Number(approvedAvailed.casualLeave || 0),
    0
  );
  const leaveBalanceDisplay = {
    casualLeave: casualRemaining,
    onDutyLeave: "N/A",
    leaveWithoutPay: "N/A",
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReportingToChange = (e) => {
    const selectedId = e.target.value;
    const selectedUser = availableUsers.find(
      (u) => String(u.id) === String(selectedId)
    );

    setFormData((prev) => ({
      ...prev,
      reportingToId: selectedId,
      reportingToName: selectedUser?.name || "",
    }));
  };

  const handleSubmit = async () => {
    if (
      !formData.startDate ||
      !formData.endDate ||
      !formData.numberOfDays ||
      !formData.reason ||
      !formData.reportingToId ||
      !formData.personInCharge
    ) {
      alert("Please fill all required fields");
      return;
    }

    const requestedDays = Number(formData.numberOfDays || 0);
    if (formData.leaveType === "Casual Leave") {
      const remainingCasual = Number(leaveBalanceDisplay.casualLeave || 0);
      if (!Number.isFinite(requestedDays) || requestedDays <= 0) {
        alert("Please select a valid leave period.");
        return;
      }
      if (requestedDays > remainingCasual) {
        alert(
          `Insufficient Casual Leave balance. Available : ${remainingCasual}, Requested: ${requestedDays}`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const data = await leaveAPI.apply({
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        numberOfDays: parseInt(formData.numberOfDays),
        reason: formData.reason,
        contactNo: formData.contactNo,
        personInCharge: formData.personInCharge,
        reportingToId: formData.reportingToId,
      });
      if (data.success) {
        alert("Leave application submitted successfully!");
        setFormData({
          name: user?.profile?.firstName
            ? `${user.profile.firstName} ${user.profile.lastName || ""}`
            : user?.username || "",
          designation: user?.employment?.designation || "",
          leaveType: "Casual Leave",
          startDate: "",
          endDate: "",
          numberOfDays: "",
          contactNo: user?.profile?.phone || "",
          reason: "",
          reportingToId: "",
          reportingToName: "",
          personInCharge: "",
        });
        fetchMyLeaves();
      } else {
        alert(data.message || "Failed to submit leave application");
      }
    } catch (error) {
      alert("Failed to submit leave application");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setLoading(true);
    try {
      const data =
        newStatus === "approved"
          ? await leaveAPI.approve(id, "Approved")
          : await leaveAPI.reject(id, "Rejected");
      if (data.success) {
        fetchPendingRequests();
      } else {
        alert(data.message || "Failed to update leave status");
      }
    } catch (error) {
      alert("Failed to update leave status");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = formRef.current;
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Leave Application - NITRRFIE</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 14px;
            line-height: 1.5;
            color: #000;
            background: #fff;
            padding: 40px 50px;
          }
          .doc-letterhead {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .logo-left, .logo-right {
            width: 65px;
            height: 65px;
            object-fit: contain;
          }
          .letterhead-center {
            flex: 1;
            text-align: center;
            padding: 0 15px;
          }
          .hindi-title {
            font-size: 13px;
            font-weight: bold;
            margin: 0;
            line-height: 1.3;
          }
          .eng-title {
            font-size: 14px;
            font-weight: bold;
            text-decoration: underline;
            margin: 4px 0;
          }
          .subtitle {
            font-size: 9px;
            font-style: italic;
            margin: 2px 0;
          }
          .address {
            font-size: 11px;
            margin: 2px 0;
          }
          .contact {
            font-size: 10px;
            margin: 2px 0;
            white-space: pre;
          }
          .doc-divider {
            border-top: 1px solid #000;
            margin: 10px 0 15px 0;
          }
          .form-title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            text-decoration: underline;
            margin: 0 0 20px 0;
          }
          .doc-content {
            margin-top: 15px;
          }
          .to-section {
            margin-bottom: 15px;
          }
          .to-section p {
            margin: 0;
            line-height: 1.4;
          }
          .subject {
            margin: 0 0 20px 0;
          }
          .form-fields {
            margin-bottom: 25px;
          }
          .field-row {
            display: flex;
            align-items: baseline;
            margin-bottom: 12px;
          }
          .field-row label {
            min-width: 180px;
            font-weight: normal;
          }
          .colon {
            margin-right: 10px;
          }
          .field-value {
            flex: 1;
            border-bottom: 1px dotted #000;
            padding: 2px 5px;
            min-height: 20px;
          }
          .period-inputs {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .date-value {
            border-bottom: 1px dotted #000;
            padding: 2px 5px;
            min-width: 100px;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
          }
          .signature-row p {
            margin: 0;
          }
          .office-section {
            margin-top: 30px;
          }
          .office-title {
            margin: 0 0 10px 0;
          }
          .office-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .office-table th, .office-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            font-size: 12px;
          }
          .office-table th {
            font-weight: bold;
          }
          .office-table td {
            height: 30px;
          }
          .office-table td:first-child {
            text-align: left;
          }
          .recommendation {
            margin: 15px 0 10px 0;
          }
          .approval-row {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
          }
          .approval-row p {
            margin: 0;
          }
          @media print {
            body {
              padding: 20px 30px;
            }
          }
        </style>
      </head>
      <body>
        <div class="doc-letterhead">
          <img src="/National_Institute_of_Technology,_Raipur_Logo.png" alt="NIT Raipur" class="logo-left" />
          <div class="letterhead-center">
            <p class="hindi-title">एन.आई.टी. रायपुर फाउंडेशन फॉर इनोवेशन एंड</p>
            <p class="hindi-title">ऑन्त्रप्रन्योरशिप</p>
            <p class="eng-title">NIT Raipur Foundation for Innovation & Entrepreneurship</p>
            <p class="subtitle">(A Technology Business Incubator & Not-for-profit Company governed by Section-8 of Companies Act 2013)</p>
            <p class="address">National Institute of Technology Raipur, G.E. Road, Raipur - 492010, C.G.</p>
            <p class="contact">Website: www.nitrrfie.in                    Email: nitrrfie@nitrr.ac.in</p>
          </div>
          <img src="/logo-NITRRFIE.png" alt="NITRRFIE" class="logo-right" />
        </div>
        <div class="doc-divider"></div>
        <h2 class="form-title">Leave Application Form</h2>
        <div class="doc-content">
          <div class="to-section">
            <p><strong>To,</strong></p>
            <p>Faculty In charge</p>
            <p>NITRRFIE, Raipur (C.G.)</p>
          </div>
          <p class="subject"><strong>Subject: Regarding Leave.</strong></p>
          <div class="form-fields">

            <!-- ADD THIS: Reporting to -->
            <div class="field-row">
              <label>Reporting to</label>
              <span class="colon">:</span>
              <span class="field-value">${formData.reportingToName || ""}</span>
            </div>

            <div class="field-row">
              <label>Name</label>
              <span class="colon">:</span>
              <span class="field-value">${formData.name}</span>
            </div>
            <div class="field-row">
              <label>Designation</label>
              <span class="colon">:</span>
              <span class="field-value">${formData.designation}</span>
            </div>

            <!-- ADD THIS: Nature of Leave -->
            <div class="field-row">
              <label>Nature of Leave</label>
              <span class="colon">:</span>
              <span class="field-value">${formData.leaveType || ""}</span>
            </div>

            <div class="field-row">
              <label>Period of Leave</label>
              <span class="colon">:</span>
              <span class="period-inputs">
                From <span class="date-value">${formData.startDate}</span>
                To <span class="date-value">${formData.endDate}</span>
              </span>
            </div>
            <div class="field-row">
              <label>Number of days</label>
              <span class="colon">:</span>
              <span class="field-value">${formData.numberOfDays}</span>
            </div>
            <div class="field-row">
              <label>Contact No.</label>
              <span class="colon">:</span>
              <span class="field-value">${formData.contactNo}</span>
            </div>
            <div class="field-row">
              <label>Reason</label>
              <span class="colon">:</span>
              <span class="field-value">${formData.reason}</span>
            </div>
            <div class="field-row">
              <label>Person In-Charge in absence</label>
              <span class="colon">:</span>
              <span class="field-value">${formData.personInCharge}</span>
            </div>
          </div>
          <div class="signature-row">
            <p><strong><u>Date of application:</u></strong> ${new Date().toLocaleDateString(
              "en-IN"
            )}</p>
            <p><strong><u>Signature of applicant</u></strong></p>
          </div>
          <div class="office-section">
            <p class="office-title"><u><strong>For Office Use Only:</strong></u></p>
            <table class="office-table">
              <thead>
                <tr>
                  <th>Nature of Leave</th>
                  <th>No. of days leave<br/>Already Availed</th>
                  <th>Leave applied for<br/>No. of Days</th>
                  <th>Leave Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Casual Leave</td>
                  <td>${approvedAvailed.casualLeave || 0}</td>
                  <td>${
                    formData.leaveType === "Casual Leave"
                      ? formData.numberOfDays
                      : ""
                  }</td>
                  <td>${leaveBalanceDisplay.casualLeave}</td>
                </tr>
                <tr>
                  <td>On Duty Leave</td>
                  <td>${approvedAvailed.onDutyLeave || 0}</td>
                  <td>${
                    formData.leaveType === "On Duty Leave"
                      ? formData.numberOfDays
                      : ""
                  }</td>
                  <td>${leaveBalanceDisplay.onDutyLeave}</td>
                </tr>
                <tr>
                  <td>Leave Without Pay</td>
                  <td>${approvedAvailed.leaveWithoutPay || 0}</td>
                  <td>${
                    formData.leaveType === "Leave Without Pay"
                      ? formData.numberOfDays
                      : ""
                  }</td>
                  <td>${leaveBalanceDisplay.leaveWithoutPay}</td>
                </tr>
              </tbody>
            </table>
            <p class="recommendation">The approval of leave for ...............................day(s) is recommended.</p>
            <div class="approval-row">
              <p><strong>Approved / Not Approved</strong></p>
              <p><strong>Faculty In-charge, NITRRFIE</strong></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const parseLocalDate = (yyyyMmDd) => {
    if (!yyyyMmDd) return null;
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    // Local midnight avoids timezone shifting issues
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const getInclusiveDayCount = (start, end) => {
    const s = parseLocalDate(start);
    const e = parseLocalDate(end);
    if (!s || !e) return "";
    if (e < s) return "";
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((e - s) / MS_PER_DAY) + 1; // inclusive
    return String(diffDays);
  };

  // Auto-update numberOfDays when dates change
  useEffect(() => {
    const computed = getInclusiveDayCount(formData.startDate, formData.endDate);

    setFormData((prev) => {
      // avoid unnecessary state updates / rerenders
      if (prev.numberOfDays === computed) return prev;
      return { ...prev, numberOfDays: computed };
    });
  }, [formData.startDate, formData.endDate]);

  return (
    <div className="leave-container">
      <div className="leave-header no-print">
        <h2>Leave Management</h2>
        <p>Apply for leave or manage employee requests</p>
      </div>

      <div className="leave-tabs no-print">
        <button
          className={`tab-btn ${activeTab === "apply" ? "active" : ""}`}
          onClick={() => setActiveTab("apply")}
        >
          <FileText size={18} />
          Apply for Leave
        </button>
        <button
          className={`tab-btn ${activeTab === "requests" ? "active" : ""}`}
          onClick={() => setActiveTab("requests")}
        >
          <Clock size={18} />
          Leave Requests
          {pendingRequests.filter((r) => r.status === "pending").length > 0 && (
            <span className="badge">
              {pendingRequests.filter((r) => r.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      <div className="leave-content">
        {activeTab === "apply" ? (
          <div className="apply-section">
            <div className="document-page" ref={formRef} id="leave-form">
              <div className="doc-letterhead">
                <img
                  src="/National_Institute_of_Technology,_Raipur_Logo.png"
                  alt="NIT Raipur"
                  className="logo-left"
                />
                <div className="letterhead-center">
                  <p className="hindi-title">
                    एन.आई.टी. रायपुर फाउंडेशन फॉर इनोवेशन एंड
                  </p>
                  <p className="hindi-title">ऑन्त्रप्रन्योरशिप</p>
                  <p className="eng-title">
                    NIT Raipur Foundation for Innovation & Entrepreneurship
                  </p>
                  <p className="subtitle">
                    (A Technology Business Incubator & Not-for-profit Company
                    governed by Section-8 of Companies Act 2013)
                  </p>
                  <p className="address">
                    National Institute of Technology Raipur, G.E. Road, Raipur -
                    492010, C.G.
                  </p>
                  <p className="contact">
                    Website: www.nitrrfie.in Email: nitrrfie@nitrr.ac.in
                  </p>
                </div>
                <img
                  src="/logo-NITRRFIE.png"
                  alt="NITRRFIE"
                  className="logo-right"
                />
              </div>

              <div className="doc-divider"></div>

              <h2 className="form-title">Leave Application Form</h2>

              <div className="doc-content">
                <div className="to-section">
                  <p>
                    <strong>To,</strong>
                  </p>
                  <p>Faculty In charge</p>
                  <p>NITRRFIE, Raipur (C.G.)</p>
                </div>

                <p className="subject">
                  <strong>Subject: Regarding Leave.</strong>
                </p>

                <div className="form-fields">
                  <div className="field-row">
                    <label>Reporting to</label>
                    <span className="colon">:</span>
                    <select
                      name="reportingToId"
                      value={formData.reportingToId}
                      onChange={handleReportingToChange}
                      className="field-input"
                    >
                      <option value="">Select approver</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.role} - {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-row">
                    <label>Name</label>
                    <span className="colon">:</span>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="field-input"
                      readOnly
                    />
                  </div>
                  <div className="field-row">
                    <label>Designation</label>
                    <span className="colon">:</span>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      className="field-input"
                      readOnly
                    />
                  </div>
                  <div className="field-row">
                    <label>Nature of Leave</label>
                    <span className="colon">:</span>
                    <select
                      name="leaveType"
                      value={formData.leaveType}
                      onChange={handleInputChange}
                      className="field-input"
                    >
                      {leaveTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field-row">
                    <label>Period of Leave</label>
                    <span className="colon">:</span>
                    <span className="period-inputs">
                      From{" "}
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="date-input"
                      />
                      To{" "}
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        className="date-input"
                      />
                    </span>
                  </div>
                  <div className="field-row">
                    <label>Number of days</label>
                    <span className="colon">:</span>
                    <input
                      type="text"
                      name="numberOfDays"
                      value={formData.numberOfDays}
                      onChange={handleInputChange}
                      className="field-input"
                      readOnly
                    />
                  </div>
                  <div className="field-row">
                    <label>Contact No.</label>
                    <span className="colon">:</span>
                    <input
                      type="text"
                      name="contactNo"
                      value={formData.contactNo}
                      onChange={handleInputChange}
                      className="field-input"
                      readOnly
                    />
                  </div>
                  <div className="field-row">
                    <label>Reason</label>
                    <span className="colon">:</span>
                    <input
                      type="text"
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      className="field-input"
                    />
                  </div>
                  <div className="field-row">
                    <label>Person In-Charge in absence</label>
                    <span className="colon">:</span>
                    <select
                      name="personInCharge"
                      value={formData.personInCharge}
                      onChange={handleInputChange}
                      className="field-input"
                    >
                      <option value="">Select person in-charge</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.role} - {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="signature-row">
                  <p>
                    <strong>
                      <u>Date of application:</u>
                    </strong>
                  </p>
                  <p>
                    <strong>
                      <u>Signature of applicant</u>
                    </strong>
                  </p>
                </div>

                <div className="office-section">
                  <p className="office-title">
                    <u>
                      <strong>For Office Use Only:</strong>
                    </u>
                  </p>
                  <table className="office-table">
                    <thead>
                      <tr>
                        <th>Nature of Leave</th>
                        <th>
                          No. of days leave
                          <br />
                          Already Availed
                        </th>
                        <th>
                          Leave applied for
                          <br />
                          No. of Days
                        </th>
                        <th>Leave Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Casual Leave</td>
                        <td>{approvedAvailed.casualLeave || 0}</td>
                        <td>
                          {formData.leaveType === "Casual Leave"
                            ? formData.numberOfDays
                            : ""}
                        </td>
                        <td>{leaveBalanceDisplay.casualLeave}</td>
                      </tr>
                      <tr>
                        <td>On Duty Leave</td>
                        <td>{approvedAvailed.onDutyLeave || 0}</td>
                        <td>
                          {formData.leaveType === "On Duty Leave"
                            ? formData.numberOfDays
                            : ""}
                        </td>
                        <td>{leaveBalanceDisplay.onDutyLeave}</td>
                      </tr>
                      <tr>
                        <td>Leave Without Pay</td>
                        <td>{approvedAvailed.leaveWithoutPay || 0}</td>
                        <td>
                          {formData.leaveType === "Leave Without Pay"
                            ? formData.numberOfDays
                            : ""}
                        </td>
                        <td>{leaveBalanceDisplay.leaveWithoutPay}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="recommendation">
                    The approval of leave for
                    ...............................day(s) is recommended.
                  </p>
                  <div className="approval-row">
                    <p>
                      <strong>Approved / Not Approved</strong>
                    </p>
                    <p>
                      <strong>Faculty In-charge, NITRRFIE</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="action-buttons no-print">
              <button type="button" className="print-btn" onClick={handlePrint}>
                <Printer size={18} />
                Print / Save as PDF
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={handleSubmit}
              >
                <Send size={18} />
                Submit Application
              </button>
            </div>
          </div>
        ) : (
          <div className="requests-section">
            {pendingRequests.length === 0 ? (
              <div className="no-requests">No leave requests found</div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req._id} className={`request-card ${req.status}`}>
                  <div className="req-header">
                    <div className="user-info">
                      <div className="avatar">
                        <User size={20} />
                      </div>
                      <div>
                        <h4>
                          {req.user?.profile?.firstName
                            ? `${req.user.profile.firstName} ${
                                req.user.profile.lastName || ""
                              }`
                            : req.user?.username || "Unknown"}
                        </h4>
                        <span className="desg">
                          {req.user?.employment?.designation || "Employee"}
                        </span>
                      </div>
                    </div>
                    <div className={`status-badge ${req.status}`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </div>
                  </div>

                  <div className="req-details">
                    <div className="detail">
                      <span className="lbl">Leave Type:</span>
                      <span className="val">{req.leaveType}</span>
                    </div>
                    <div className="detail">
                      <span className="lbl">Period:</span>
                      <span className="val">
                        <Calendar size={14} />{" "}
                        {new Date(req.startDate).toLocaleDateString()} to{" "}
                        {new Date(req.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="detail">
                      <span className="lbl">Days:</span>
                      <span className="val">{req.numberOfDays}</span>
                    </div>
                    <div className="detail">
                      <span className="lbl">Contact:</span>
                      <span className="val">{req.contactNo}</span>
                    </div>
                    <div className="detail full">
                      <span className="lbl">Reason:</span>
                      <span className="val">{req.reason}</span>
                    </div>
                    <div className="detail">
                      <span className="lbl">In-Charge:</span>
                      <span className="val">
                        <UserCheck size={14} /> {req.personInCharge}
                      </span>
                    </div>
                  </div>

                  {req.status === "pending" && (
                    <div className="req-actions">
                      <button
                        className="reject-btn"
                        onClick={() => handleStatusChange(req._id, "rejected")}
                        disabled={loading}
                      >
                        <X size={18} /> Reject
                      </button>
                      <button
                        className="approve-btn"
                        onClick={() => handleStatusChange(req._id, "approved")}
                        disabled={loading}
                      >
                        <Check size={18} /> Approve
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;
