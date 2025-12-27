import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  User,
  LayoutDashboard,
  Plus,
  FileText,
  Eye,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import "../../index.css";

import AddNewRequest from "../../Assets/AddNewRequest.png";
import MyRequests from "../../Assets/MyRequest.png";
import ViewRequests from "../../Assets/ViewRequest.png";
import MyAssignments from "../../Assets/MyAssignments.png";
import Summary from "../../Assets/Summary.png";
//import Configuration from "../../Assets/Configuration.png";

const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [employeeData, setEmployeeData] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Get employee data from sessionStorage or props
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setEmployeeData(userData);
      console.log("👤 Employee Data:", userData);
    } else if (user) {
      setEmployeeData(user);
      console.log("👤 Employee Data from props:", user);
    }
  }, [user]);

  const sidebarItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "add-request", label: "Add New Request", icon: Plus },
    { id: "my-requests", label: "My Requests", icon: FileText },
    { id: "view-requests", label: "View Requests", icon: Eye },
    { id: "assignments", label: "My Assignments", icon: ClipboardList },
    { id: "summary", label: "Summary", icon: BarChart3 },
    // { id: "configuration", label: "Configuration", icon: Settings },
    { id: "logout", label: "Logout", icon: LogOut },
  ];

  const requestCards = [
    {
      title: t("add_new_request.title"),
      description: t("add_new_request.description"),
      icon: AddNewRequest,
      path: "/AddNewRequest",
      action: "Create New Request",
    },
    {
      title: t("my_requests.title"),
      description: t("my_requests.description"),
      icon: MyRequests,
      path: "/MyRequests",
      action: "View My Requests",
    },
    {
      title: t("view_requests.title"),
      description: t("view_requests.description"),
      icon: ViewRequests,
      path: "/ViewRequests",
      action: "Explore Requests",
    },
    {
      title: t("my_assignments.title"),
      description: t("my_assignments.description"),
      icon: MyAssignments,
      path: "/MyAssignments",
      action: "View Assignments",
    },
    {
      title: t("summary.title"),
      description: t("summary.description"),
      icon: Summary,
      path: "/Summary",
      action: "View Summary",
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-inner">
          <div className="dashboard-welcome">
            <div className="welcome-text">
              <h2 className="section-title">
                {t("request_management.button")}
              </h2>
              <div className="card-grid">
                {requestCards.map((card, index) => (
                  <div
                    key={index}
                    className="card-box"
                    onClick={() => navigate(card.path)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="card-content">
                      <div className="card-icon">
                        <img src={card.icon} alt={card.title} />
                      </div>
                      <div className="card-text">
                        <h3>{card.title}</h3>
                        <p>{card.description}</p>
                      </div>
                    </div>
                    <div className="card-footer">
                      <span className="card-action">
                        {card.action}
                        <svg
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
