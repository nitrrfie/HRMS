import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  Star,
  CalendarCheck,
  Clock,
  DollarSign,
  FolderOpen,
  UserCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_HIERARCHY } from "../constants/roles";
import { dashboardAPI, getPhotoUrl } from "../services/api";
import VariableRemuneration from "./VariableRemuneration";
import Remuneration from "./Remuneration";
import PeerRating from "./PeerRating";
import AttendanceRecord from "./AttendanceRecord";
import LeaveManagement from "./LeaveManagement";
import EmployeeManagement from "./EmployeeManagement";
import Salary from "./Salary";
import EFiling from "./EFiling";
import Settings from "./Settings";
import ProfileEdit from "./ProfileEdit";
import "./Dashboard.css";
import Calendar from "./calendar";

const Dashboard = ({ onLogout }) => {
  const { user, isAdmin } = useAuth();
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
      if (!event.target.closest('.user-profile-preview')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await dashboardAPI.getStats();
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

  const userLevel = ROLE_HIERARCHY[user?.role] ?? 99;
  const isCEO = user?.role === ROLES.CEO;
  const isAdminOrCEO = userLevel <= 1;
  const isManagerLevel = userLevel <= 2;
  const role = localStorage.getItem("role");

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
          <p>Welcome back, {user?.username || "CEO"}</p>
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
        return <Salary />;
      case "peer-rating":
        return <PeerRating />;
      case "variable-remuneration":
        return <VariableRemuneration />;
      case "remuneration":
        return <Remuneration />;
      case "efiling":
        return <EFiling />;
      case "settings":
        return <Settings />;
      case "calendar":
        return <Calendar/>
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
            <div className="logo-icon">HR</div>
            {isSidebarOpen && <span className="logo-text">NITRRFIE</span>}
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeView === "dashboard" ? "active" : ""
                }`}
              onClick={() => setActiveView("dashboard")}
            >
              <LayoutDashboard size={20} />
              {isSidebarOpen && <span>Dashboard</span>}
            </button>
            <button
              className={`nav-item ${activeView === "employees" ? "active" : ""
                }`}
              onClick={() => setActiveView("employees")}
            >
              <Users size={20} />
              {isSidebarOpen && <span>Employees</span>}
            </button>
            {isManagerLevel && (
              <button
                className={`nav-item ${activeView === "attendance" ? "active" : ""
                  }`}
                onClick={() => setActiveView("attendance")}
              >
                <CalendarCheck size={20} />
                {isSidebarOpen && <span>Attendance</span>}
              </button>
            )}
            {isManagerLevel && (
              <button
                className={`nav-item ${activeView === "leave" ? "active" : ""}`}
                onClick={() => setActiveView("leave")}
              >
                <Clock size={20} />
                {isSidebarOpen && <span>Leave</span>}
              </button>
            )}
            {(user?.role === ROLES.ACCOUNTANT || user?.role === ROLES.EMPLOYEE) && (
              <button
                className={`nav-item ${activeView === "salary" ? "active" : ""
                  }`}
                onClick={() => setActiveView("salary")}
              >
                <DollarSign size={20} />
                {isSidebarOpen && <span>Salary</span>}
              </button>
            )}
            {isManagerLevel && role !== "FACULTY_IN_CHARGE" && (
              <button
                className={`nav-item ${activeView === "peer-rating" ? "active" : ""
                  }`}
                onClick={() => setActiveView("peer-rating")}
              >
                <Star size={20} />
                {isSidebarOpen && <span>Peer Rating</span>}
              </button>
            )}
            {isManagerLevel && role === "FACULTY_IN_CHARGE" && (
              <button
                className={`nav-item ${activeView === "variable-remuneration" ? "active" : ""
                  }`}
                onClick={() => setActiveView("variable-remuneration")}
              >
                <Star size={20} />
                {isSidebarOpen && <span>Variable Remuneration</span>}
              </button>
            )}
            {isManagerLevel && (
              <button
                className={`nav-item ${activeView === "remuneration" ? "active" : ""
                  }`}
                onClick={() => setActiveView("remuneration")}
              >
                <FileText size={20} />
                {isSidebarOpen && <span>Remuneration</span>}
              </button>
            )}
            {isManagerLevel && (
              <button
                className={`nav-item ${activeView === "calendar" ? "active" : ""
                  }`}
                onClick={() => setActiveView("calendar")}
              >
                <FileText size={20} />
                {isSidebarOpen && <span>Calendar</span>}
              </button>
            )}
            {isManagerLevel && (
              <button
                className={`nav-item ${activeView === "efiling" ? "active" : ""
                  }`}
                onClick={() => setActiveView("efiling")}
              >
                <FolderOpen size={20} />
                {isSidebarOpen && <span>E-Filing</span>}
              </button>
            )}
            {isManagerLevel && (
              <button
                className={`nav-item ${activeView === "settings" ? "active" : ""
                  }`}
                onClick={() => setActiveView("settings")}
              >
                <SettingsIcon size={20} />
                {isSidebarOpen && <span>Settings</span>}
              </button>
            )}
          </nav>
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
              <div className="user-profile-preview" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="user-avatar">
                  {user?.profile?.photo ? (
                    <img 
                      src={getPhotoUrl(user.profile.photo)} 
                      alt="Profile" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }} 
                    />
                  ) : (
                    user?.username?.[0]?.toUpperCase() || "U"
                  )}
                </div>
                <span className="user-name">{user?.username || "User"}</span>
                {showProfileMenu && (
                  <div className="profile-dropdown-menu">
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
