import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  PlusSquare,
  FileText,
  Eye,
  ClipboardCheck,
  BarChart3,
  User,
  Settings,
  ArrowRightCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import "../../index.css";
import SLT from "../../Assets/E-Bird.png";

const SideBar = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    {
      id: "dashboard",
      icon: Home,
      label: t("sidebar.dashboard"),
      path: "/Dashboard",
    },
    {
      id: "add-request",
      icon: PlusSquare,
      label: t("sidebar.add_request"),
      path: "/AddNewRequest",
    },
    {
      id: "my-requests",
      icon: FileText,
      label: t("sidebar.my_requests"),
      path: "/MyRequests",
    },
    {
      id: "view-requests",
      icon: Eye,
      label: t("sidebar.view_requests"),
      path: "/ViewRequests",
    },
    {
      id: "my-assignments",
      icon: ClipboardCheck,
      label: t("sidebar.my_assignments"),
      path: "/MyAssignments",
    },
    {
      id: "summary",
      icon: BarChart3,
      label: t("sidebar.summary"),
      path: "/Summary",
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <img src={SLT} alt="Telecom" className="SLT-Telecome" />
      </div>

      {/* Main Navigation */}
      <nav className="main-nav">
        <ul className="nav-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`nav-button ${
                    isActive(item.path) ? "active" : ""
                  }`}
                >
                  <Icon size={18} />
                  <span className="nav-label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="bottom-nav">
        <ul className="nav-list">
          <li>
            <button onClick={onLogout} className="nav-button">
              <ArrowRightCircle size={18} />
              <span className="nav-label">{t("sidebar.logout")}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SideBar;
