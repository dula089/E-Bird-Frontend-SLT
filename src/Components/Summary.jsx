import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Send,
  Inbox,
  LayoutDashboard,
} from "lucide-react";
import "../Components/RequestCSS/Summary.css";
import { getAccessToken } from "../utils/authUtils";
import { getCurrentUser } from "../utils/userUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Summary = () => {
  const [myRequests, setMyRequests] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "requests", "assignments"
  const { t } = useTranslation();

  useEffect(() => {
    fetchData();
  }, []);

  const createHeaders = async () => {
    const user = getCurrentUser();
    const headers = {
      "Content-Type": "application/json",
    };

    if (user && user.profile !== "erp_employee") {
      try {
        const token = await getAccessToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Error getting token:", error);
      }
    }

    return headers;
  };

  const fetchData = async () => {
    try {
      const user = getCurrentUser();

      if (!user) {
        console.error("❌ No user data found");
        alert("Unable to identify current user. Please log in again.");
        return;
      }

      console.log("👤 Current user:", user);
      setUserName(user.name || user.employeeName || "User");

      const headers = await createHeaders();

      // Fetch ALL requests and categories
      const [requestsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/AddNewRequest`, {
          method: "GET",
          headers: headers,
        }),
        fetch(`${API_BASE_URL}/Categories`, {
          method: "GET",
          headers: headers,
        }),
      ]);

      if (requestsRes.ok) {
        const allData = await requestsRes.json();
        console.log("📥 All requests fetched:", allData.length);

        // Filter MY REQUESTS (created by me)
        const userRequests = allData.filter((request) => {
          const assignedBy = request.assignedBy || "";

          if (user.profile === "erp_employee") {
            const employeeMatch = assignedBy.includes(user.employeeNumber);
            const nameMatch = assignedBy
              .toLowerCase()
              .includes(user.name.toLowerCase());
            return employeeMatch || nameMatch;
          }

          const matchesEmail =
            assignedBy.toLowerCase() === user.email?.toLowerCase();
          const matchesUsername =
            assignedBy.toLowerCase() === user.username?.toLowerCase();
          const matchesName =
            assignedBy.toLowerCase() === user.name?.toLowerCase();
          const containsUsername = assignedBy
            .toLowerCase()
            .includes(user.username?.toLowerCase() || "");
          const containsName = assignedBy
            .toLowerCase()
            .includes(user.name?.toLowerCase() || "");

          return (
            matchesEmail ||
            matchesUsername ||
            matchesName ||
            containsUsername ||
            containsName
          );
        });

        // Filter MY ASSIGNMENTS (assigned to me)
        const userAssignments = allData.filter((request) => {
          if (!request.assignTo) return false;

          const assignToLower = request.assignTo.toLowerCase();

          if (user.profile === "erp_employee") {
            const employeeMatch = assignToLower.includes(user.employeeNumber);
            const nameMatch = assignToLower.includes(user.name.toLowerCase());
            return employeeMatch || nameMatch;
          }

          const userEmailLower = user.email?.toLowerCase() || "";
          const userNameLower = user.name?.toLowerCase() || "";
          const userUsernameLower = user.username?.toLowerCase() || "";

          return (
            assignToLower === userEmailLower ||
            assignToLower === userNameLower ||
            assignToLower === userUsernameLower ||
            assignToLower.includes(userEmailLower.split("@")[0]) ||
            assignToLower.includes(userNameLower) ||
            assignToLower.includes(userUsernameLower)
          );
        });

        console.log(`✅ My Requests: ${userRequests.length}`);
        console.log(`✅ My Assignments: ${userAssignments.length}`);

        setMyRequests(userRequests);
        setMyAssignments(userAssignments);
      } else {
        console.error("❌ Failed to fetch requests");
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      } else {
        console.error("❌ Failed to fetch categories");
      }
    } catch (error) {
      console.error("💥 Error fetching data:", error);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  // Get the active dataset based on selected tab
  const getActiveRequests = () => {
    if (activeTab === "requests") return myRequests;
    if (activeTab === "assignments") return myAssignments;
    return [...myRequests, ...myAssignments]; // Combined for overview
  };

  const requests = getActiveRequests();

  // Calculate statistics
  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === "Pending").length;
  const inProgressRequests = requests.filter(
    (r) => r.status === "In Progress"
  ).length;
  const completedRequests = requests.filter(
    (r) => r.status === "Completed"
  ).length;
  const rejectedRequests = requests.filter(
    (r) => r.status === "Rejected"
  ).length;
  const underReviewRequests = requests.filter(
    (r) => r.status === "Under Review"
  ).length;
  const approvedRequests = requests.filter(
    (r) => r.status === "Approved"
  ).length;

  // Calculate completion rate
  const completionRate =
    totalRequests > 0
      ? ((completedRequests / totalRequests) * 100).toFixed(1)
      : 0;

  // Get requests by category
  const requestsByCategory = categories.reduce((acc, cat) => {
    const count = requests.filter((r) => r.mainCategory === cat.name).length;
    if (count > 0) {
      acc.push({ category: cat.name, count });
    }
    return acc;
  }, []);

  // Sort by count descending
  requestsByCategory.sort((a, b) => b.count - a.count);

  // Get recent requests (last 5)
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate))
    .slice(0, 5);

  // Get requests by month (current year)
  const currentYear = new Date().getFullYear();
  const monthlyData = Array(12).fill(0);
  requests.forEach((req) => {
    const date = new Date(req.receivedDate);
    if (date.getFullYear() === currentYear) {
      monthlyData[date.getMonth()]++;
    }
  });

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString("en-GB") : "";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#f59e0b";
      case "In Progress":
        return "#3b82f6";
      case "Under Review":
        return "#8b5cf6";
      case "Approved":
        return "#FFC0CB";
      case "Completed":
        return "#22c55e";
      case "Rejected":
        return "#ef4444";
      default:
        return "#9ca3af";
    }
  };

  if (loading) {
    return (
      <div className="summary-container">
        <div className="fancy-loader">
          <div className="loader-container">
            <div className="loader-box"></div>
            <div className="loader-box"></div>
            <div className="loader-box"></div>
            <div className="loader-box"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <button className="summary-btn" style={{ width: "130px" }}>
          SUMMARY
        </button>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "25px",
          background: "#dcdfe3",
          padding: "8px",
          borderRadius: "12px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
        }}
      >
        <button
          onClick={() => setActiveTab("overview")}
          style={{
            flex: 1,
            padding: "12px 20px",
            border: "none",
            background:
              activeTab === "overview"
                ? "linear-gradient(135deg, #0078d7 0%, #005a9e 100%)"
                : "transparent",
            color: activeTab === "overview" ? "white" : "#666",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: activeTab === "overview" ? "600" : "500",
            fontSize: "14px",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow:
              activeTab === "overview"
                ? "0 4px 12px rgba(0, 120, 215, 0.3)"
                : "none",
            transform: activeTab === "overview" ? "translateY(-2px)" : "none",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "overview") {
              e.currentTarget.style.background = "#e9ecef";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "overview") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          style={{
            flex: 1,
            padding: "12px 20px",
            border: "none",
            background:
              activeTab === "requests"
                ? "linear-gradient(135deg, #9b54bc 0%, #ce9ee4 100%)"
                : "transparent",
            color: activeTab === "requests" ? "white" : "#666",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: activeTab === "requests" ? "600" : "500",
            fontSize: "14px",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow:
              activeTab === "requests"
                ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                : "none",
            transform: activeTab === "requests" ? "translateY(-2px)" : "none",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "requests") {
              e.currentTarget.style.background = "#e9ecef";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "requests") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <Send size={18} />
          <span>My Requests</span>
          <span
            style={{
              background:
                activeTab === "requests" ? "rgba(255,255,255,0.3)" : "#e9ecef",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "600",
              minWidth: "24px",
              textAlign: "center",
            }}
          >
            {myRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("assignments")}
          style={{
            flex: 1,
            padding: "12px 20px",
            border: "none",
            background:
              activeTab === "assignments"
                ? "linear-gradient(135deg, #5eaa4f 0%, #88dd77 100%)"
                : "transparent",
            color: activeTab === "assignments" ? "white" : "#666",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: activeTab === "assignments" ? "600" : "500",
            fontSize: "14px",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow:
              activeTab === "assignments"
                ? "0 4px 12px rgba(240, 147, 251, 0.3)"
                : "none",
            transform:
              activeTab === "assignments" ? "translateY(-2px)" : "none",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "assignments") {
              e.currentTarget.style.background = "#e9ecef";
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== "assignments") {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <Inbox size={18} />
          <span>My Assignments</span>
          <span
            style={{
              background:
                activeTab === "assignments"
                  ? "rgba(255,255,255,0.3)"
                  : "#e9ecef",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "600",
              minWidth: "24px",
              textAlign: "center",
            }}
          >
            {myAssignments.length}
          </span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <FileText size={15} />
          </div>
          <div className="stat-content">
            <h3>
              Total{" "}
              {activeTab === "requests"
                ? "Requests"
                : activeTab === "assignments"
                ? "Assignments"
                : "Items"}
            </h3>
            <p className="stat-number">{totalRequests}</p>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">
            <Clock size={15} />
          </div>
          <div className="stat-content">
            <h3>Pending</h3>
            <p className="stat-number">{pendingRequests}</p>
          </div>
        </div>

        <div className="stat-card in-progress">
          <div className="stat-icon">
            <AlertCircle size={15} />
          </div>
          <div className="stat-content">
            <h3>In Progress</h3>
            <p className="stat-number">{inProgressRequests}</p>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">
            <CheckCircle size={15} />
          </div>
          <div className="stat-content">
            <h3>Completed</h3>
            <p className="stat-number">{completedRequests}</p>
          </div>
        </div>

        <div className="stat-card rejected">
          <div className="stat-icon">
            <XCircle size={15} />
          </div>
          <div className="stat-content">
            <h3>Rejected</h3>
            <p className="stat-number">{rejectedRequests}</p>
          </div>
        </div>

        <div className="stat-card completion-rate">
          <div className="stat-icon">
            <TrendingUp size={15} />
          </div>
          <div className="stat-content">
            <h3>Completion Rate</h3>
            <p className="stat-number">{completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Quick Stats for Overview Tab */}
      {activeTab === "overview" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "20px",
            marginBottom: "20px",
          }}
        ></div>
      )}

      {/* Two Column Layout */}
      <div className="summary-content">
        <div className="summary-left">
          <div className="summary-card">
            <h2>
              {activeTab === "requests"
                ? "My Requests"
                : activeTab === "assignments"
                ? "My Assignments"
                : "All Items"}{" "}
              by Month ({currentYear})
            </h2>
            <div className="chart-container">
              {monthlyData.map((count, index) => {
                const maxCount = Math.max(...monthlyData, 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={index} className="chart-bar-wrapper">
                    <div className="chart-bar">
                      {count > 0 && (
                        <div
                          className="chart-bar-fill"
                          style={{ height: `${height}%` }}
                          title={`${count} items`}
                        >
                          <span className="chart-bar-value">{count}</span>
                        </div>
                      )}
                    </div>
                    <span className="chart-bar-label">{monthNames[index]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="summary-card">
            <h2>Status Distribution</h2>
            <div className="status-bars">
              <div className="status-bar-item">
                <div className="status-bar-label">
                  <span>Pending</span>
                  <span className="status-count">{pendingRequests}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${
                        totalRequests > 0
                          ? (pendingRequests / totalRequests) * 100
                          : 0
                      }%`,
                      backgroundColor: "#f59e0b",
                    }}
                  />
                </div>
              </div>

              <div className="status-bar-item">
                <div className="status-bar-label">
                  <span>In Progress</span>
                  <span className="status-count">{inProgressRequests}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${
                        totalRequests > 0
                          ? (inProgressRequests / totalRequests) * 100
                          : 0
                      }%`,
                      backgroundColor: "#3b82f6",
                    }}
                  />
                </div>
              </div>

              <div className="status-bar-item">
                <div className="status-bar-label">
                  <span>Under Review</span>
                  <span className="status-count">{underReviewRequests}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${
                        totalRequests > 0
                          ? (underReviewRequests / totalRequests) * 100
                          : 0
                      }%`,
                      backgroundColor: "#8b5cf6",
                    }}
                  />
                </div>
              </div>

              <div className="status-bar-item">
                <div className="status-bar-label">
                  <span>Approved</span>
                  <span className="status-count">{approvedRequests}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${
                        totalRequests > 0
                          ? (approvedRequests / totalRequests) * 100
                          : 0
                      }%`,
                      backgroundColor: "#FFC0CB",
                    }}
                  />
                </div>
              </div>

              <div className="status-bar-item">
                <div className="status-bar-label">
                  <span>Completed</span>
                  <span className="status-count">{completedRequests}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${
                        totalRequests > 0
                          ? (completedRequests / totalRequests) * 100
                          : 0
                      }%`,
                      backgroundColor: "#22c55e",
                    }}
                  />
                </div>
              </div>

              <div className="status-bar-item">
                <div className="status-bar-label">
                  <span>Rejected</span>
                  <span className="status-count">{rejectedRequests}</span>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${
                        totalRequests > 0
                          ? (rejectedRequests / totalRequests) * 100
                          : 0
                      }%`,
                      backgroundColor: "#ef4444",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="summary-right">
          {/* Requests by Category */}
          <div className="summary-card">
            <h2>
              {activeTab === "requests"
                ? "Requests"
                : activeTab === "assignments"
                ? "Assignments"
                : "Items"}{" "}
              by Category
            </h2>
            {requestsByCategory.length > 0 ? (
              <div className="category-list">
                {requestsByCategory.map((item, index) => (
                  <div key={index} className="category-item">
                    <div className="category-name">{item.category}</div>
                    <div className="category-count-badge">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No categories data available</p>
            )}
          </div>

          {/* Recent Items */}
          <div className="summary-card">
            <h2>
              Recent{" "}
              {activeTab === "requests"
                ? "Requests"
                : activeTab === "assignments"
                ? "Assignments"
                : "Items"}
            </h2>
            {recentRequests.length > 0 ? (
              <div className="recent-list">
                {recentRequests.map((req) => (
                  <div key={req.id} className="recent-item">
                    <div className="recent-item-header">
                      <span className="recent-item-id">{req.requestId}</span>
                      <span
                        className="recent-item-status"
                        style={{ backgroundColor: getStatusColor(req.status) }}
                      >
                        {req.status}
                      </span>
                    </div>
                    <div className="recent-item-category">
                      {req.mainCategory}
                    </div>
                    <div className="recent-item-date">
                      <Calendar size={14} />
                      {formatDate(req.receivedDate)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No recent items</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
