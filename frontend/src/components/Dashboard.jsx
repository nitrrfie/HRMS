import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Menu,
  Star,
  CalendarCheck,
  Clock,
  DollarSign,
  FolderOpen,
  UserCircle,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import nitrrfieLogo from "../assets/logo.png";

import { getAccessibleNavItems } from "../constants/permissions";
import { dashboardAPI, getPhotoUrl, leaveAPI } from "../services/api";
import VariableRemuneration from "./VariableRemuneration";
import Remuneration from "./Remuneration";
import PeerRating from "./PeerRating";
import AttendanceRecord from "./AttendanceRecord";
import LeaveManagement from "./LeaveManagement";
import EmployeeManagement from "./EmployeeManagement";
import PaySlip from "./PaySlip";
import EFiling from "./EFiling";
import ProfileEdit from "./ProfileEdit";
import AdminPanel from "./AdminPanel";
import "./Dashboard.css";
import Calendar from "./Calendar";

const Dashboard = ({ onLogout }) => {
  const { user, isAdmin, getRoleHierarchyLevel, canAccessComponent } =
    useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    stats: { totalEmployees: 0, presentToday: 0, onLeave: 0, pendingLeaves: 0 },
    employeeAttendance: [],
    activities: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".user-profile-preview")) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await dashboardAPI.getStats();
        console.log(`Dashboard data: ${data.stats.totalEmployees}`);
        if (data.success) {
          setDashboardData({
            stats: data.stats,
            employeeAttendance: data.employeeAttendance || [],
            activities: data.activities || [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("apply");

  useEffect(() => {
    fetchPendingRequests();
  }, [activeTab]);

  const fetchPendingRequests = async () => {
    try {
      const data = await leaveAPI.getPending();
      console.log(data);
      if (data.success) {
        setPendingRequests(data.leaves || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending leaves:", error);
    }
  };

  const formatDateTime = () => {
    return (
      currentDateTime.toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      " | " +
      currentDateTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  };

  const userLevel = getRoleHierarchyLevel(user?.role);

  // Get navigation items accessible to current user (using database permissions)
  const accessibleNavItems = getAccessibleNavItems(user, canAccessComponent);

  // Icon mapping for navigation items
  const iconMap = {
    LayoutDashboard,
    Users,
    CalendarCheck,
    Clock,
    DollarSign,
    Star,
    FileText,
    FolderOpen,
    Shield,
  };

  const stats = [
    {
      id: 1,
      label: "Total Employees",
      value: String(dashboardData.stats.totalEmployees),
      color: "teal",
    },
    {
      id: 2,
      label: "Present Today",
      value: String(dashboardData.stats.presentToday),
      color: "emerald",
    },
    {
      id: 3,
      label: "On Leave",
      value: String(dashboardData.stats.onLeave),
      color: "amber",
    },
    {
      id: 4,
      label: "Pending Leaves",
      value: String(dashboardData.stats.pendingLeaves),
      color: "rose",
    },
  ];

  const employeeAttendance =
    dashboardData.employeeAttendance.length > 0
      ? dashboardData.employeeAttendance
      : [
          {
            name: "No attendance records",
            role: "",
            status: "present",
            checkIn: "-",
          },
        ];

  const activities =
    dashboardData.activities.length > 0
      ? dashboardData.activities
      : [{ text: "No recent activities", time: "", type: "info" }];

  const renderDashboardContent = () => (
    <div className="ceo-dashboard">
      <header className="ceo-header">
        <div className="ceo-header-left">
          <h1>Dashboard</h1>
          <p>
            Welcome back,{" "}
            {user?.profile.firstName + " " + user?.profile.lastName || "CEO"}
          </p>
        </div>
      </header>

      <div className="ceo-stats-row">
        {stats.map((stat) => (
          <div key={stat.id} className={`ceo-stat-card ${stat.color}`}>
            <span className="ceo-stat-value">{stat.value}</span>
            <span className="ceo-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="ceo-main-grid">
        <div className="ceo-attendance-section">
          <div className="section-header">
            <h2>Attendance Overview</h2>
            <span className="section-subtitle">Level 2 & 3 Employees</span>
          </div>
          <div className="attendance-list">
            {employeeAttendance.map((emp, idx) => (
              <div key={idx} className="attendance-item">
                <div className="emp-avatar-small">
                  {emp.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="emp-info">
                  <span className="emp-name">{emp.name}</span>
                  <span className="emp-role">{emp.role}</span>
                </div>
                <div className={`emp-status ${emp.status}`}>
                  {emp.status === "present" ? "Present" : "On Leave"}
                </div>
                <span className="emp-checkin">{emp.checkIn}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ceo-activity-section">
          <div className="section-header">
            <h2>Recent Activities</h2>
            <span className="section-subtitle">Latest updates</span>
          </div>
          <div className="activity-list">
            {activities.map((activity, idx) => (
              <div key={idx} className="activity-item">
                <div className={`activity-indicator ${activity.type}`}></div>
                <div className="activity-content">
                  <p>{activity.text}</p>
                  <span>{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case "employees":
        return <EmployeeManagement />;
      case "attendance":
        return <AttendanceRecord />;
      case "leave":
        return <LeaveManagement />;
      case "salary":
        return <PaySlip />;
      case "peer-rating":
        return <PeerRating />;
      case "variable-remuneration":
        return <VariableRemuneration />;
      case "remuneration":
        return <Remuneration />;
      case "efiling":
        return <EFiling />;
      case "calendar":
        return <Calendar />;
      case "admin":
        return <AdminPanel />;
      case "profile":
        return <ProfileEdit onBack={() => setActiveView("dashboard")} />;
      default:
        return renderDashboardContent();
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="app-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-header">
            <img src={nitrrfieLogo} alt="NITRRFIE" className="logo-icon" />
            {isSidebarOpen && <span className="logo-text">NITRRFIE</span>}
          </div>

          <nav className="sidebar-nav">
            {accessibleNavItems.map((item) => {
              const IconComponent = iconMap[item.icon];
              return (
                <button
                  key={item.id}
                  className={`nav-item ${
                    activeView === item.view ? "active" : ""
                  }`}
                  onClick={() => setActiveView(item.view)}
                >
                  {IconComponent && <IconComponent size={20} />}
                  {isSidebarOpen && (
                    <>
                      <span>{item.label}</span>
                      {item.view === "leave" && pendingRequests.length >= 1 && (
                        <span className="badge">{pendingRequests.length}</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <button className="nav-item logout-btn" onClick={onLogout}>
              <LogOut size={20} />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <header className="dashboard-top-bar">
            <button
              className="sidebar-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu size={24} />
            </button>
            <div className="top-bar-right">
              <span className="current-date">{formatDateTime()}</span>
              <div
                className="user-profile-preview"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="user-avatar">
                  {user?.profile?.photo ? (
                    <img
                      src={getPhotoUrl(user.profile.photo)}
                      alt="Profile"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  ) : (
                    user?.profile?.firstName?.[0]?.toUpperCase() ||
                    user?.username?.[0]?.toUpperCase() ||
                    "U"
                  )}
                </div>
                <span className="user-name">
                  {user?.profile?.firstName || user?.username || "User"}
                </span>
                {showProfileMenu && (
                  <div className="profile-dropdown-menu">
                    {canAccessComponent("profile") && (
                      <button
                        className="profile-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveView("profile");
                          setShowProfileMenu(false);
                        }}
                      >
                        <UserCircle size={18} />
                        <span>Edit Profile</span>
                      </button>
                    )}
                    <button
                      className="profile-menu-item logout"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="content-area">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
