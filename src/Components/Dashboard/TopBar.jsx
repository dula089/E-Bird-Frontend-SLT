import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import "../../index.css";

const TopBar = ({ currentUser, onSearchChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { t, i18n } = useTranslation();

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  // Get Initials from employeeName
  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const initials = getInitials(currentUser?.name);

  return (
    <div className="topbar">
      <div className="topbar-right">
        <div className="user-info">
          <div className="avatar">{initials}</div>
          <span className="username">{currentUser?.name || "User"}</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
