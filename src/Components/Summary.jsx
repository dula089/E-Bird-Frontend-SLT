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
} from "lucide-react";
import "../Components/RequestCSS/Summary.css";
import { getAccessToken } from "../utils/authUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Summary = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const { t } = useTranslation();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getAccessToken(); // Get token once

      const [requestsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/AddNewRequest`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        fetch(`${API_BASE_URL}/Categories`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      } else {
        console.error("Failed to fetch requests");
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      } else {
        console.error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

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
      <button className="summary-btn" style={{ width: "130px" }}>
        SUMMARY
      </button>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">
            <FileText size={15} />
          </div>
          <div className="stat-content">
            <h3>Total Requests</h3>
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

      {/* Two Column Layout */}
      <div className="summary-content">
        <div className="summary-left">
          <div className="summary-card">
            <h2>Requests by Month ({currentYear})</h2>
            <div className="chart-container">
              {monthlyData.map((count, index) => {
                const maxCount = Math.max(...monthlyData, 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={index} className="chart-bar-wrapper">
                    <div className="chart-bar">
                      {count > 0 && ( // Added condition here
                        <div
                          className="chart-bar-fill"
                          style={{ height: `${height}%` }}
                          title={`${count} requests`}
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
            <h2>Requests by Category</h2>
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

          {/* Recent Requests */}
          <div className="summary-card">
            <h2>Recent Requests</h2>
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
              <p className="no-data">No recent requests</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
