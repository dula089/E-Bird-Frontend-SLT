import React, { useState, useEffect, useMemo } from "react";
import { Eye, Forward, History, Paperclip, Download } from "lucide-react";
import "../Components/RequestCSS/MyRequest.css";
import { useTranslation } from "react-i18next";
import { getAccessToken } from "../utils/authUtils";
import { getCurrentUser } from "../utils/userUtils";
import {
  getOrganizationList,
  getCostCentersForOrganization,
  getEmployeeList,
} from "../utils/erpApi";
import Swal from "sweetalert2";
import SearchableDropdown from "./SearchableDropdown/SearchableDropdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BACKEND_URL = `${API_BASE_URL}/AddNewRequest`;
const CATEGORY_URL = `${API_BASE_URL}/Categories`;

const MyAssignment = () => {
  const [myAssignments, setMyAssignments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [modalRequest, setModalRequest] = useState(null);
  const [forwardModal, setForwardModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [forwardTo, setForwardTo] = useState("");
  const [forwardRemarks, setForwardRemarks] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [employeeMap, setEmployeeMap] = useState({});
  const [assignFromMap, setAssignFromMap] = useState({});

  const [forwardGroupList, setForwardGroupList] = useState([]);
  const [forwardDesignationList, setForwardDesignationList] = useState([]);
  const [forwardEmployeeList, setForwardEmployeeList] = useState([]);
  const [forwardGroup, setForwardGroup] = useState("");
  const [forwardDesignation, setForwardDesignation] = useState("");
  const [selectedForwardOrgId, setSelectedForwardOrgId] = useState("");

  const itemsPerPage = 6;

  const { t } = useTranslation();

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

  const handleDownloadAttachment = async (attachment) => {
    console.log("📥 Attempting download:", attachment);

    if (!attachment) {
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Attachment data not available",
        confirmButtonColor: "#d33",
      });
      return;
    }

    Swal.fire({
      title: "Downloading...",
      text: "Please wait",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      if (attachment.cout && attachment.cout.trim()) {
        console.log("✅ Base64 data found, length:", attachment.cout.length);

        const base64Data = attachment.cout.replace(/\s/g, "");

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        const fileName =
          attachment.attachName || attachment.title || "attachment";
        let mimeType = "application/octet-stream";

        if (fileName.toLowerCase().endsWith(".pdf")) {
          mimeType = "application/pdf";
        } else if (fileName.toLowerCase().match(/\.(jpg|jpeg)$/)) {
          mimeType = "image/jpeg";
        } else if (fileName.toLowerCase().endsWith(".png")) {
          mimeType = "image/png";
        } else if (fileName.toLowerCase().match(/\.(doc|docx)$/)) {
          mimeType = "application/msword";
        } else if (fileName.toLowerCase().match(/\.(xls|xlsx)$/)) {
          mimeType = "application/vnd.ms-excel";
        }

        const blob = new Blob([byteArray], { type: mimeType });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Swal.close();

        Swal.fire({
          icon: "success",
          title: "Download Complete",
          text: `${fileName} has been downloaded`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        console.log("⚠️ No base64 data available");

        Swal.fire({
          icon: "warning",
          title: "Attachment Not Available",
          html: `
          <div style="text-align: left; padding: 10px;">
            <p><strong>File Name:</strong> ${attachment.attachName || "N/A"}</p>
            <p><strong>Title:</strong> ${attachment.title || "N/A"}</p>
            <p><strong>Size:</strong> ${attachment.size || "N/A"}</p>
          </div>
          <div style="margin-top: 15px; padding: 10px; background-color: #fef3c7; border-radius: 6px; font-size: 13px;">
            <strong>Note:</strong> The file content is not available for download. The file may need to be re-uploaded.
          </div>
        `,
          confirmButtonColor: "#3b82f6",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("❌ Error downloading attachment:", error);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text:
          error.message || "Failed to download attachment. Please try again.",
        confirmButtonColor: "#d33",
      });
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      alert("Unable to identify current user. Please log in again.");
      return;
    }
    setCurrentUser(user);
    console.log("Current user in MyAssignment:", user);

    const fetchCategories = async () => {
      try {
        const headers = await createHeaders();
        const res = await fetch(CATEGORY_URL, { headers });

        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data);
        console.log("✅ Categories fetched:", data.length);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    const fetchAssignments = async () => {
      try {
        const headers = await createHeaders();
        const res = await fetch(BACKEND_URL, { headers });

        if (!res.ok) throw new Error("Failed to fetch requests");
        const allRequests = await res.json();
        console.log("📥 All requests fetched:", allRequests.length);

        const userAssignments = allRequests.filter((request) => {
          if (!request.assignTo) return false;

          const assignToLower = request.assignTo.toLowerCase();
          const forwardedByLower = request.forwardedBy?.toLowerCase() || "";

          if (user.profile === "erp_employee") {
            const employeeMatch = assignToLower.includes(user.employeeNumber);
            const nameMatch = assignToLower.includes(user.name.toLowerCase());
            const forwardedByMe =
              forwardedByLower.includes(user.employeeNumber) ||
              forwardedByLower.includes(user.name.toLowerCase());
            return employeeMatch || nameMatch || forwardedByMe;
          }

          const userEmailLower = user.email?.toLowerCase() || "";
          const userNameLower = user.name?.toLowerCase() || "";
          const userUsernameLower = user.username?.toLowerCase() || "";

          const isAssignedToMe =
            assignToLower === userEmailLower ||
            assignToLower === userNameLower ||
            assignToLower === userUsernameLower ||
            assignToLower.includes(userEmailLower.split("@")[0]) ||
            assignToLower.includes(userNameLower) ||
            assignToLower.includes(userUsernameLower);

          const isForwardedByMe =
            forwardedByLower === userEmailLower ||
            forwardedByLower === userNameLower ||
            forwardedByLower === userUsernameLower ||
            forwardedByLower.includes(userEmailLower.split("@")[0]) ||
            forwardedByLower.includes(userNameLower) ||
            forwardedByLower.includes(userUsernameLower);

          return isAssignedToMe || isForwardedByMe;
        });

        setMyAssignments(userAssignments);
        console.log(
          `✅ Found ${userAssignments.length} assignments for ${user.name} (from ${allRequests.length} total)`
        );
      } catch (error) {
        console.error("Error fetching assignments:", error);
        setMyAssignments([]);
      } finally {
        setTimeout(() => setLoading(false), 1000);
      }
    };

    fetchCategories();
    fetchAssignments();
  }, []);

  useEffect(
    () => setCurrentPage(1),
    [startDate, endDate, selectedCategory, selectedStatus]
  );

  const getAssignToDisplay = (assignTo, assignToName) => {
    if (assignToName) return assignToName;

    if (!assignTo) return "Not Assigned";

    if (/^\d{6}$/.test(assignTo)) {
      const name = employeeMap[assignTo];
      if (name) {
        return `${name} (${assignTo})`;
      }
    }

    return assignTo;
  };

  const isForwardedByCurrentUser = (assignment) => {
    if (!currentUser || !assignment.forwardedBy) return false;

    const forwardedByLower = assignment.forwardedBy.toLowerCase();

    if (currentUser.profile === "erp_employee") {
      return (
        forwardedByLower.includes(currentUser.employeeNumber) ||
        forwardedByLower.includes(currentUser.name.toLowerCase())
      );
    }

    const userEmailLower = currentUser.email?.toLowerCase() || "";
    const userNameLower = currentUser.name?.toLowerCase() || "";
    const userUsernameLower = currentUser.username?.toLowerCase() || "";

    return (
      forwardedByLower === userEmailLower ||
      forwardedByLower === userNameLower ||
      forwardedByLower === userUsernameLower ||
      forwardedByLower.includes(userEmailLower.split("@")[0]) ||
      forwardedByLower.includes(userNameLower) ||
      forwardedByLower.includes(userUsernameLower)
    );
  };

  const getStatusProgress = (status) => {
    switch (status) {
      case "Pending":
        return { value: 10, color: "#f59e0b" };
      case "In Progress":
        return { value: 50, color: "#3b82f6" };
      case "Under Review":
        return { value: 75, color: "#a855f7" };
      case "Approved":
        return { value: 100, color: "#FFC0CB" };
      case "Completed":
        return { value: 100, color: "#22c55e" };
      case "Rejected":
        return { value: 100, color: "#ef4444" };
      default:
        return { value: 0, color: "#9ca3af" };
    }
  };

  const formatDisplayDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString("en-GB") : "";

  const filteredAssignmentsAll = useMemo(
    () =>
      myAssignments.filter((assignment) => {
        const matchesStartDate =
          !startDate ||
          new Date(assignment.receivedDate) >= new Date(startDate);
        const matchesEndDate =
          !endDate || new Date(assignment.receivedDate) <= new Date(endDate);
        const matchesCategory =
          selectedCategory === "All Categories" ||
          assignment.mainCategory === selectedCategory;
        const matchesStatus =
          selectedStatus === "All Statuses" ||
          assignment.status === selectedStatus;
        return (
          matchesStartDate && matchesEndDate && matchesCategory && matchesStatus
        );
      }),
    [myAssignments, startDate, endDate, selectedCategory, selectedStatus]
  );

  const totalPages = Math.ceil(filteredAssignmentsAll.length / itemsPerPage);

  const paginatedAssignments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssignmentsAll.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssignmentsAll, currentPage]);

  const openModal = (assignment) => {
    console.log("📋 Opening modal for assignment:", assignment);
    console.log("📎 Attachments data:", assignment.attachments);
    console.log("📎 Attachments type:", typeof assignment.attachments);
    console.log("📎 Attachments length:", assignment.attachments?.length);
    setModalRequest({ ...assignment });
  };
  const closeModal = () => setModalRequest(null);

  const openHistoryModal = (assignment) => {
    setHistoryModal({ ...assignment });
  };

  const closeHistoryModal = () => {
    setHistoryModal(null);
  };

  const openForwardModal = async (assignment) => {
    setForwardModal({ ...assignment });
    setForwardTo("");
    setForwardRemarks("");
    setForwardGroup("");
    setForwardDesignation("");
    setForwardDesignationList([]);
    setForwardEmployeeList([]);
    setSelectedForwardOrgId("");

    try {
      console.log("📞 Fetching ERP organizations for forward modal...");
      const data = await getOrganizationList();

      if (data && Array.isArray(data)) {
        setForwardGroupList(data);
        console.log("✅ Organizations loaded:", data.length);
      } else {
        console.warn("⚠️ Invalid organization data");
        setForwardGroupList([]);
      }
    } catch (error) {
      console.error("❌ Failed to fetch organizations:", error);
      setForwardGroupList([]);
    }
  };

  const closeForwardModal = () => {
    setForwardModal(null);
    setForwardTo("");
    setForwardRemarks("");
    setForwardGroup("");
    setForwardDesignation("");
    setForwardGroupList([]);
    setForwardDesignationList([]);
    setForwardEmployeeList([]);
    setSelectedForwardOrgId("");
  };

  const handleForwardGroupChange = async (organizationName) => {
    setForwardGroup(organizationName);
    setForwardDesignation("");
    setForwardTo("");
    setForwardDesignationList([]);
    setForwardEmployeeList([]);

    if (!organizationName) {
      setSelectedForwardOrgId("");
      return;
    }

    console.log("🔄 Forward Group changed to:", organizationName);

    const selectedOrg = forwardGroupList.find(
      (org) => (org.organizationName || org.name) === organizationName
    );

    if (!selectedOrg) {
      console.warn("⚠️ Organization not found");
      return;
    }

    const orgId = selectedOrg.organizationId;
    setSelectedForwardOrgId(orgId);
    console.log("📌 Selected org ID:", orgId);

    try {
      const costCenters = await getCostCentersForOrganization(orgId, "");

      if (costCenters && costCenters.length > 0) {
        setForwardDesignationList(costCenters);
        console.log("✅ Cost centers loaded:", costCenters.length);
      } else {
        console.warn("⚠️ No cost centers found");
        setForwardDesignationList([]);
      }
    } catch (error) {
      console.error("❌ Error fetching cost centers:", error);
      setForwardDesignationList([]);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load designations",
        confirmButtonColor: "#d33",
        timer: 3000,
      });
    }
  };

  const handleForwardDesignationChange = async (costCenter) => {
    setForwardDesignation(costCenter);
    setForwardTo("");
    setForwardEmployeeList([]);

    if (!costCenter || !selectedForwardOrgId) {
      return;
    }

    console.log("🔄 Forward Designation changed to:", costCenter);

    try {
      const employees = await getEmployeeList(selectedForwardOrgId, costCenter);

      if (employees && employees.length > 0) {
        const transformedEmployees = employees.map((emp) => ({
          id: emp.employeeNumber,
          email: emp.employeeNumber,
          name: emp.employeeName,
          designation: emp.designation,
          employeeNumber: emp.employeeNumber,
          gradeName: emp.gradeName,
        }));

        setForwardEmployeeList(transformedEmployees);
        console.log("✅ Employees loaded:", transformedEmployees.length);
      } else {
        console.warn("⚠️ No employees found");
        setForwardEmployeeList([]);
      }
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
      setForwardEmployeeList([]);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load employees",
        confirmButtonColor: "#d33",
        timer: 3000,
      });
    }
  };

  const handleChange = (e) => {
    setModalRequest({ ...modalRequest, [e.target.name]: e.target.value });
  };

  const handleForward = async () => {
    if (!forwardModal?.id) return alert("No assignment selected");
    if (!forwardTo.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Forward To Required",
        text: "Please select an employee to forward this assignment to",
        confirmButtonText: "OK",
        confirmButtonColor: "#f59e0b",
      });
      return;
    }

    try {
      const headers = await createHeaders();

      const forwardingHistory = forwardModal.forwardingHistory || [];

      const selectedEmployee = forwardEmployeeList.find(
        (emp) => emp.employeeNumber === forwardTo
      );

      const currentAssigneeDisplay = getAssignToDisplay(forwardModal.assignTo);
      const forwardToDisplay = selectedEmployee
        ? `${selectedEmployee.name} (${selectedEmployee.employeeNumber})`
        : forwardTo;

      const newHistoryEntry = {
        timestamp: new Date().toISOString(),
        forwardedBy: currentUser?.name || currentUser?.email || "System",
        forwardedFrom: currentAssigneeDisplay,
        forwardedTo: forwardToDisplay,
        remarks: forwardRemarks || "No remarks",
      };

      forwardingHistory.push(newHistoryEntry);

      const updatedAssignment = {
        ...forwardModal,
        assignTo: forwardTo,
        assignToName: forwardToDisplay,
        forwardedBy: currentUser?.name || currentUser?.email || "System",
        remarks: forwardRemarks || forwardModal.remarks,
        forwardingHistory: forwardingHistory,
        lastForwardedDate: new Date().toISOString(),
      };

      const res = await fetch(`${BACKEND_URL}/${forwardModal.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updatedAssignment),
      });

      if (!res.ok) throw new Error("Failed to forward assignment");

      Swal.fire({
        icon: "success",
        title: `ASSIGNMENT FORWARDED SUCCESSFULLY <br> ${forwardModal.requestId}`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      closeForwardModal();

      const refresh = await fetch(BACKEND_URL, {
        headers: await createHeaders(),
      });
      const allRequests = await refresh.json();

      const userAssignments = allRequests.filter((request) => {
        if (!request.assignTo || !currentUser) return false;
        const assignToLower = request.assignTo.toLowerCase();
        const forwardedByLower = request.forwardedBy?.toLowerCase() || "";

        if (currentUser.profile === "erp_employee") {
          const employeeMatch = assignToLower.includes(
            currentUser.employeeNumber
          );
          const nameMatch = assignToLower.includes(
            currentUser.name.toLowerCase()
          );
          const forwardedByMe =
            forwardedByLower.includes(currentUser.employeeNumber) ||
            forwardedByLower.includes(currentUser.name.toLowerCase());
          return employeeMatch || nameMatch || forwardedByMe;
        }

        const userEmailLower = currentUser.email?.toLowerCase() || "";
        const userNameLower = currentUser.name?.toLowerCase() || "";
        const userUsernameLower = currentUser.username?.toLowerCase() || "";

        const isAssignedToMe =
          assignToLower === userEmailLower ||
          assignToLower === userNameLower ||
          assignToLower === userUsernameLower ||
          assignToLower.includes(userEmailLower.split("@")[0]) ||
          assignToLower.includes(userNameLower) ||
          assignToLower.includes(userUsernameLower);

        const isForwardedByMe =
          forwardedByLower === userEmailLower ||
          forwardedByLower === userNameLower ||
          forwardedByLower === userUsernameLower ||
          forwardedByLower.includes(userEmailLower.split("@")[0]) ||
          forwardedByLower.includes(userNameLower) ||
          forwardedByLower.includes(userUsernameLower);

        return isAssignedToMe || isForwardedByMe;
      });

      setMyAssignments(userAssignments);
    } catch (error) {
      console.error("Error forwarding assignment:", error);
      Swal.fire({
        icon: "error",
        title: "Forward Failed",
        text: error.message || "Please try again",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });
    }
  };

  const handleSave = async () => {
    if (!modalRequest?.id) return alert("No assignment selected");
    try {
      const headers = await createHeaders();
      const res = await fetch(`${BACKEND_URL}/${modalRequest.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(modalRequest),
      });

      if (!res.ok) throw new Error("Failed to save changes");

      Swal.fire({
        icon: "success",
        title: `ASSIGNMENT UPDATED SUCCESSFULLY <br> ${modalRequest.requestId}`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      closeModal();

      const refresh = await fetch(BACKEND_URL, {
        headers: await createHeaders(),
      });
      const allRequests = await refresh.json();

      const userAssignments = allRequests.filter((request) => {
        if (!request.assignTo || !currentUser) return false;
        const assignToLower = request.assignTo.toLowerCase();
        const forwardedByLower = request.forwardedBy?.toLowerCase() || "";

        if (currentUser.profile === "erp_employee") {
          const employeeMatch = assignToLower.includes(
            currentUser.employeeNumber
          );
          const nameMatch = assignToLower.includes(
            currentUser.name.toLowerCase()
          );
          const forwardedByMe =
            forwardedByLower.includes(currentUser.employeeNumber) ||
            forwardedByLower.includes(currentUser.name.toLowerCase());
          return employeeMatch || nameMatch || forwardedByMe;
        }

        const userEmailLower = currentUser.email?.toLowerCase() || "";
        const userNameLower = currentUser.name?.toLowerCase() || "";
        const userUsernameLower = currentUser.username?.toLowerCase() || "";

        const isAssignedToMe =
          assignToLower === userEmailLower ||
          assignToLower === userNameLower ||
          assignToLower === userUsernameLower;

        const isForwardedByMe =
          forwardedByLower === userEmailLower ||
          forwardedByLower === userNameLower ||
          forwardedByLower === userUsernameLower;

        return isAssignedToMe || isForwardedByMe;
      });

      setMyAssignments(userAssignments);
    } catch (error) {
      console.error("Error saving assignment:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message || "Please try again",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });
    }
  };

  const handleDelete = async () => {
    if (!modalRequest?.id) return alert("No assignment selected");

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this assignment?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      const headers = await createHeaders();
      const res = await fetch(`${BACKEND_URL}/${modalRequest.id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Failed to delete assignment");

      Swal.fire({
        icon: "success",
        title: "ASSIGNMENT DELETED SUCCESSFULLY",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      closeModal();

      const refresh = await fetch(BACKEND_URL, {
        headers: await createHeaders(),
      });
      const allRequests = await refresh.json();

      const userAssignments = allRequests.filter((request) => {
        if (!request.assignTo || !currentUser) return false;
        const assignToLower = request.assignTo.toLowerCase();
        const forwardedByLower = request.forwardedBy?.toLowerCase() || "";

        if (currentUser.profile === "erp_employee") {
          const employeeMatch = assignToLower.includes(
            currentUser.employeeNumber
          );
          const nameMatch = assignToLower.includes(
            currentUser.name.toLowerCase()
          );
          const forwardedByMe =
            forwardedByLower.includes(currentUser.employeeNumber) ||
            forwardedByLower.includes(currentUser.name.toLowerCase());
          return employeeMatch || nameMatch || forwardedByMe;
        }

        const userEmailLower = currentUser.email?.toLowerCase() || "";
        const userNameLower = currentUser.name?.toLowerCase() || "";
        const userUsernameLower = currentUser.username?.toLowerCase() || "";

        const isAssignedToMe =
          assignToLower === userEmailLower ||
          assignToLower === userNameLower ||
          assignToLower === userUsernameLower;

        const isForwardedByMe =
          forwardedByLower === userEmailLower ||
          forwardedByLower === userNameLower ||
          forwardedByLower === userUsernameLower;

        return isAssignedToMe || isForwardedByMe;
      });

      setMyAssignments(userAssignments);
    } catch (error) {
      console.error("Error deleting assignment:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.message || "Please try again",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });
    }
  };

  return (
    <div className="my-request-container">
      {loading ? (
        <div className="fancy-loader">
          <div className="loader-container">
            <div className="loader-box"></div>
            <div className="loader-box"></div>
            <div className="loader-box"></div>
            <div className="loader-box"></div>
          </div>
        </div>
      ) : (
        <>
          <button
            style={{ width: "160px", letterSpacing: "0.4px" }}
            className="my-request-btn"
          >
            {t("my_assignments.button")}
          </button>

          <div className="filter-section">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option>{t("all_categories")}</option>
              {categories.map((cat, idx) => (
                <option key={idx} value={cat.name || cat}>
                  {cat.name || cat}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option>{t("all_statuses")}</option>
              <option>{t("pending")}</option>
              <option>{t("in_progress")}</option>
              <option>{t("under_review")}</option>
              <option>{t("approved")}</option>
              <option>{t("completed")}</option>
              <option>{t("rejected")}</option>
            </select>
          </div>

          <div className="status-legend">
            <div>
              <span className="legend-box pending"></span> {t("pending")}
            </div>
            <div>
              <span className="legend-box in-progress"></span>
              {t("in_progress")}
            </div>
            <div>
              <span className="legend-box under-review"></span>
              {t("under_review")}
            </div>
            <div>
              <span className="legend-box approved"></span> {t("approved")}
            </div>
            <div>
              <span className="legend-box completed"></span> {t("completed")}
            </div>
            <div>
              <span className="legend-box rejected"></span> {t("rejected")}
            </div>
          </div>

          <p className="request-count-info">
            SHOWING {paginatedAssignments.length} OF{" "}
            {filteredAssignmentsAll.length} ASSIGNMENTS
          </p>

          {paginatedAssignments.length === 0 ? (
            <div
              style={{
                padding: "60px 40px",
                textAlign: "center",
                backgroundColor: "#f9f9f9",
                borderRadius: "8px",
                margin: "20px 0",
              }}
            >
              <h3 style={{ color: "#666", marginBottom: "15px" }}>
                NO ASSIGNMENTS FOUND
              </h3>
              <p style={{ fontSize: "14px", color: "#888" }}>
                You don't have any tasks assigned to you at the moment.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="request-table">
                <thead>
                  <tr>
                    <th>{t("reference")}</th>
                    <th>{t("created")}</th>
                    <th>{t("assign_to")}</th>
                    <th>{t("main_category")}</th>
                    <th>{t("assign_from")}</th>
                    <th>{t("current_status")}</th>
                    <th>{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAssignments.map((req) => (
                    <tr key={req.id}>
                      <td>
                        {req.requestId}
                        {req.attachments && req.attachments.length > 0 && (
                          <Paperclip
                            size={14}
                            style={{
                              marginLeft: "6px",
                              color: "#6b7280",
                              verticalAlign: "middle",
                            }}
                          />
                        )}
                      </td>
                      <td>{formatDisplayDate(req.receivedDate)}</td>
                      <td>
                        {getAssignToDisplay(req.assignTo, req.assignToName)}
                        {isForwardedByCurrentUser(req) && (
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: "4px",
                              padding: "2px 6px",
                              backgroundColor: "#fef3c7",
                              color: "#92400e",
                              fontSize: "9px",
                              fontWeight: "bold",
                              borderRadius: "4px",
                              border: "1px solid #fbbf24",
                              width: "fit-content",
                              marginLeft: "8px",
                            }}
                          >
                            FORWARDED
                          </span>
                        )}
                      </td>
                      <td>{req.mainCategory}</td>
                      <td>{req.assignedBy || req.organization || "System"}</td>
                      <td>
                        <div className="status-cell">
                          <div className="status-bar-wrapper">
                            <div
                              className="status-bar-fill"
                              style={{
                                width: `${
                                  getStatusProgress(req.status).value
                                }%`,
                                backgroundColor: getStatusProgress(req.status)
                                  .color,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="view-btn"
                            onClick={() => openModal(req)}
                            title="View"
                          >
                            <Eye size={17} />
                          </button>
                          <button
                            className="forward-btn"
                            onClick={() => openForwardModal(req)}
                            title="Forward"
                          >
                            <Forward size={17} />
                          </button>
                          {req.forwardingHistory &&
                            req.forwardingHistory.length > 0 && (
                              <button
                                className="history-btn"
                                onClick={() => openHistoryModal(req)}
                                title="View Forward History"
                                style={{
                                  backgroundColor: "transparent",
                                  color: "#9333ea",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "opacity 0.2s ease",
                                }}
                              >
                                <History size={17} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                {t("previous")}
              </button>
              <span>
                {t("page")} {currentPage} {t("of")} {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                {t("next")}
              </button>
            </div>
          )}
        </>
      )}

      {modalRequest && (
        <div className="modal-overlay">
          <div
            className="modal"
            style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <button className="close-button" onClick={closeModal}>
              ×
            </button>
            <h3 className="modal-title">View / Edit Assignment</h3>

            <table className="modal-table">
              <tbody>
                <tr>
                  <td style={{ width: "200px" }}>
                    <strong>Reference</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      name="requestId"
                      value={modalRequest.requestId || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Received Date</strong>
                  </td>
                  <td>
                    <input
                      type="date"
                      name="receivedDate"
                      value={modalRequest.receivedDate || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Main Category</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      name="mainCategory"
                      value={modalRequest.mainCategory || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Assigned By</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      name="assignedBy"
                      value={modalRequest.assignedBy || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Request in Brief</strong>
                  </td>
                  <td>
                    <textarea
                      name="requestInBrief"
                      value={
                        modalRequest.requestInBrief || "No details provided"
                      }
                      readOnly
                      rows="4"
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "14px",
                        backgroundColor: "#f5f5f5",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        resize: "none",
                        color: "#333",
                        cursor: "default",
                      }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Remarks</strong>
                  </td>
                  <td>
                    <textarea
                      name="remarks"
                      value={modalRequest.remarks || "No remarks available"}
                      readOnly
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "14px",
                        backgroundColor: "#f5f5f5",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        resize: "none",
                        color: "#333",
                        cursor: "default",
                      }}
                    />
                  </td>
                </tr>

                {modalRequest.attachments &&
                  modalRequest.attachments.length > 0 && (
                    <tr>
                      <td>
                        <strong>Attachments</strong>
                      </td>
                      <td>
                        <div
                          style={{
                            backgroundColor: "#f9fafb",
                            padding: "12px",
                            borderRadius: "6px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          {modalRequest.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px",
                                marginBottom:
                                  index < modalRequest.attachments.length - 1
                                    ? "8px"
                                    : "0",
                                backgroundColor: "#ffffff",
                                borderRadius: "4px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  flex: 1,
                                }}
                              >
                                <Paperclip
                                  size={16}
                                  style={{ color: "#6b7280" }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: "14px",
                                      fontWeight: "500",
                                      color: "#374151",
                                    }}
                                  >
                                    {attachment.title ||
                                      attachment.attachName ||
                                      `Attachment ${index + 1}`}
                                  </div>
                                  {attachment.size && (
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
                                        marginTop: "2px",
                                      }}
                                    >
                                      {attachment.size}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleDownloadAttachment(attachment)
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "6px 12px",
                                  fontSize: "13px",
                                  backgroundColor: "#3b82f6",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  transition: "background-color 0.2s",
                                }}
                                onMouseOver={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#2563eb")
                                }
                                onMouseOut={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    "#3b82f6")
                                }
                              >
                                View Info
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}

                <tr>
                  <td>
                    <strong>Status</strong>
                  </td>
                  <td>
                    <select
                      name="status"
                      value={modalRequest.status || "Pending"}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        marginBottom: "10px",
                      }}
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Under Review</option>
                      <option>Approved</option>
                      <option>Completed</option>
                      <option>Rejected</option>
                    </select>
                    <div className="modal-progress-wrapper">
                      <div
                        className="modal-progress-fill"
                        style={{
                          width: `${
                            getStatusProgress(modalRequest.status).value
                          }%`,
                          backgroundColor: getStatusProgress(
                            modalRequest.status
                          ).color,
                        }}
                      />
                    </div>
                    <div className="modal-progress-label">
                      {getStatusProgress(modalRequest.status).value}% Complete
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="modal-actions">
              <button onClick={handleSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {forwardModal && (
        <div className="modal-overlay">
          <div
            className="modal"
            style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <button className="close-button" onClick={closeForwardModal}>
              ×
            </button>
            <h3 className="modal-title">Forward Assignment</h3>

            <table className="modal-table">
              <tbody>
                <tr>
                  <td style={{ width: "200px" }}>
                    <strong>Reference</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={forwardModal.requestId || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Main Category</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={forwardModal.mainCategory || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Current Assignee</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={
                        getAssignToDisplay(
                          forwardModal.assignTo,
                          forwardModal.assignToName
                        ) || ""
                      }
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Assigned By</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={forwardModal.assignedBy || ""}
                      readOnly
                      style={{ backgroundColor: "#f5f5f5" }}
                    />
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>Section *</strong>
                  </td>
                  <td>
                    <SearchableDropdown
                      options={forwardGroupList}
                      value={forwardGroup}
                      onChange={handleForwardGroupChange}
                      placeholder="Select Section"
                      displayKey="organizationName"
                      valueKey="organizationName"
                    />
                    {forwardGroupList.length === 0 && (
                      <small
                        style={{
                          color: "#888",
                          fontSize: "11px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        Loading sections...
                      </small>
                    )}
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>Group *</strong>
                  </td>
                  <td>
                    <select
                      value={forwardDesignation}
                      onChange={(e) =>
                        handleForwardDesignationChange(e.target.value)
                      }
                      disabled={!forwardGroup}
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    >
                      <option value="">
                        {forwardGroup ? "Select Group" : "Select Section first"}
                      </option>
                      {forwardDesignationList.map((cc, index) => (
                        <option key={index} value={cc.costCenter}>
                          {cc.division} ({cc.costCenter})
                        </option>
                      ))}
                    </select>
                    {forwardGroup && forwardDesignationList.length === 0 && (
                      <small
                        style={{
                          color: "#888",
                          fontSize: "11px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        Loading groups...
                      </small>
                    )}
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>Forward To *</strong>
                  </td>
                  <td>
                    <select
                      value={forwardTo}
                      onChange={(e) => setForwardTo(e.target.value)}
                      disabled={!forwardDesignation}
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                      }}
                    >
                      <option value="">
                        {forwardDesignation
                          ? "Select Employee"
                          : "Select Group first"}
                      </option>
                      {forwardEmployeeList
                        .filter((employee) => {
                          if (!currentUser) return true;
                          const isCurrentUser =
                            employee.employeeNumber ===
                            currentUser.employeeNumber;
                          const isCurrentAssignee =
                            employee.employeeNumber === forwardModal.assignTo;
                          return !isCurrentUser && !isCurrentAssignee;
                        })
                        .map((employee) => (
                          <option
                            key={employee.employeeNumber}
                            value={employee.employeeNumber}
                          >
                            {employee.name} ({employee.designation})
                          </option>
                        ))}
                    </select>
                    {forwardDesignation && forwardEmployeeList.length === 0 && (
                      <small
                        style={{
                          color: "#888",
                          fontSize: "11px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        Loading employees...
                      </small>
                    )}
                  </td>
                </tr>

                <tr>
                  <td>
                    <strong>Remarks (Optional)</strong>
                  </td>
                  <td>
                    <textarea
                      value={forwardRemarks}
                      onChange={(e) => setForwardRemarks(e.target.value)}
                      rows="3"
                      placeholder="Add forwarding remarks..."
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontFamily: "inherit",
                        resize: "none",
                      }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="modal-actions">
              <button onClick={handleForward}>Forward Assignment</button>
              <button className="cancel-btn" onClick={closeForwardModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="modal-overlay">
          <div
            className="modal"
            style={{ maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <button className="close-button" onClick={closeHistoryModal}>
              ×
            </button>
            <h3 className="modal-title">Forwarding History</h3>

            <div style={{ padding: "20px" }}>
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <p style={{ margin: "5px 0", fontSize: "14px" }}>
                  <strong>Reference:</strong> {historyModal.requestId}
                </p>
                <p style={{ margin: "5px 0", fontSize: "14px" }}>
                  <strong>Category:</strong> {historyModal.mainCategory}
                </p>
                <p style={{ margin: "5px 0", fontSize: "14px" }}>
                  <strong>Current Assignee:</strong>{" "}
                  {getAssignToDisplay(
                    historyModal.assignTo,
                    historyModal.assignToName
                  )}
                </p>
              </div>

              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "15px",
                  color: "#374151",
                }}
              >
                Forward History Timeline:
              </h4>

              {historyModal.forwardingHistory &&
              historyModal.forwardingHistory.length > 0 ? (
                <div style={{ position: "relative", paddingLeft: "30px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "8px",
                      top: "10px",
                      bottom: "10px",
                      width: "2px",
                      backgroundColor: "#d1d5db",
                    }}
                  />

                  {historyModal.forwardingHistory.map((history, index) => (
                    <div
                      key={index}
                      style={{
                        position: "relative",
                        marginBottom: "20px",
                        backgroundColor: "#ffffff",
                        padding: "15px",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "-22px",
                          top: "20px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: "#9333ea",
                          border: "2px solid white",
                          boxShadow: "0 0 0 2px #e5e7eb",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              margin: "5px 0",
                              fontSize: "13px",
                              color: "#6b7280",
                            }}
                          >
                            <strong style={{ color: "#374151" }}>
                              Forwarded By:
                            </strong>{" "}
                            {history.forwardedBy}
                          </p>
                          <p
                            style={{
                              margin: "5px 0",
                              fontSize: "13px",
                              color: "#6b7280",
                            }}
                          >
                            <strong style={{ color: "#374151" }}>From:</strong>{" "}
                            {history.forwardedFrom}
                          </p>
                          <p
                            style={{
                              margin: "5px 0",
                              fontSize: "13px",
                              color: "#6b7280",
                            }}
                          >
                            <strong style={{ color: "#374151" }}>To:</strong>{" "}
                            {history.forwardedTo}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p
                            style={{
                              margin: "0",
                              fontSize: "11px",
                              color: "#9ca3af",
                            }}
                          >
                            {new Date(history.timestamp).toLocaleString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                      </div>

                      {history.remarks && history.remarks !== "No remarks" && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px",
                            backgroundColor: "#f9fafb",
                            borderRadius: "4px",
                            borderLeft: "3px solid #9333ea",
                          }}
                        >
                          <p
                            style={{
                              margin: "0",
                              fontSize: "12px",
                              color: "#6b7280",
                            }}
                          >
                            <strong style={{ color: "#374151" }}>
                              Remarks:
                            </strong>{" "}
                            {history.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                    color: "#6b7280",
                  }}
                >
                  <History
                    size={48}
                    style={{ opacity: 0.3, marginBottom: "10px" }}
                  />
                  <p style={{ margin: "0", fontSize: "14px" }}>
                    No forwarding history available
                  </p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={closeHistoryModal}
                style={{ width: "120px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAssignment;
