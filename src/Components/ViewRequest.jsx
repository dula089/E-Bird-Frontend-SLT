import React, { useState, useEffect, useMemo } from "react";
import { Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "../Components/ViewRequest.css";
import { useTranslation } from "react-i18next";
import { getAccessToken } from "../utils/authUtils";
import { getCurrentUser } from "../utils/userUtils";
import { getEmployeeSubordinates } from "../utils/erpApi";
import Swal from "sweetalert2";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BACKEND_URL = `${API_BASE_URL}/AddNewRequest`;

const ViewRequest = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedEmployee, setSelectedEmployee] = useState("All Employees");
  const [modalRequest, setModalRequest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [subordinateEmployees, setSubordinateEmployees] = useState([]);
  const [employeeMap, setEmployeeMap] = useState({});
  const itemsPerPage = 10;
  const { t } = useTranslation();

  // ✅ Smart header creation function
  const createHeaders = async () => {
    const user = getCurrentUser();
    const headers = { "Content-Type": "application/json" };

    if (user && user.profile !== "erp_employee") {
      try {
        const token = await getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error("Error getting token:", error);
      }
    }
    return headers;
  };

  // ✅ ENHANCED: Recursively fetch ALL levels of subordinates
  const fetchAllSubordinates = async (
    employeeNumber,
    existingMap = {},
    fetchedEmployees = new Set()
  ) => {
    try {
      // Prevent infinite loops
      if (fetchedEmployees.has(employeeNumber)) {
        return { allSubordinates: [], nameMap: existingMap };
      }
      fetchedEmployees.add(employeeNumber);

      console.log("🔍 Fetching subordinates for:", employeeNumber);
      const subordinates = await getEmployeeSubordinates(employeeNumber);

      console.log("📦 Raw subordinates response:", subordinates);

      if (!subordinates || !Array.isArray(subordinates)) {
        return { allSubordinates: [], nameMap: existingMap };
      }

      let allSubordinates = [...subordinates];
      const updatedMap = { ...existingMap };

      // ✅ FIXED: Handle both employeeNo and employeeNumber fields
      subordinates.forEach((emp) => {
        const empNumber = emp.employeeNumber || emp.employeeNo;
        if (empNumber) {
          const fullName = `${emp.employeeTitle || ""} ${
            emp.employeeInitials || ""
          } ${emp.employeeSurname || ""}`.trim();
          const displayName = fullName || emp.employeeName;

          // Bidirectional mapping
          updatedMap[empNumber] = displayName;
          updatedMap[displayName] = empNumber;
          if (emp.employeeName && emp.employeeName !== displayName) {
            updatedMap[emp.employeeName] = empNumber;
          }
        }
      });

      // ✅ Recursively fetch nested subordinates
      for (const subordinate of subordinates) {
        const empNumber = subordinate.employeeNumber || subordinate.employeeNo;
        if (empNumber && !fetchedEmployees.has(empNumber)) {
          try {
            const { allSubordinates: nested, nameMap: nestedMap } =
              await fetchAllSubordinates(
                empNumber,
                updatedMap,
                fetchedEmployees
              );

            if (nested.length > 0) {
              allSubordinates = [...allSubordinates, ...nested];
              Object.assign(updatedMap, nestedMap);
            }
          } catch (error) {
            console.error(
              `❌ Error fetching nested subordinates for ${empNumber}:`,
              error
            );
          }
        }
      }

      console.log(
        "✅ Total subordinates (including nested):",
        allSubordinates.length
      );
      return { allSubordinates, nameMap: updatedMap };
    } catch (error) {
      console.error("❌ Error fetching subordinates:", error);
      return { allSubordinates: [], nameMap: existingMap };
    }
  };

  // ✅ Fetch employee names for requests
  const fetchEmployeeNamesForRequests = async (requests, existingNameMap) => {
    try {
      const employeeNumbers = new Set();

      // Collect ALL employee numbers from both assignTo and assignedBy
      requests.forEach((req) => {
        const assignTo = String(req.assignTo || "").trim();
        const assignedBy = String(req.assignedBy || "").trim();

        // Extract employee number if it's a 6-digit number
        if (/^\d{6}$/.test(assignTo)) {
          employeeNumbers.add(assignTo);
        }
        if (/^\d{6}$/.test(assignedBy)) {
          employeeNumbers.add(assignedBy);
        }

        // Also extract from patterns like "NAME (012345)"
        const assignToMatch = assignTo.match(/\((\d{6})\)/);
        const assignedByMatch = assignedBy.match(/\((\d{6})\)/);
        if (assignToMatch) employeeNumbers.add(assignToMatch[1]);
        if (assignedByMatch) employeeNumbers.add(assignedByMatch[1]);
      });

      console.log(
        "🔍 Employee numbers to fetch names for:",
        Array.from(employeeNumbers)
      );

      const updatedNameMap = { ...existingNameMap };

      // Fetch names for each employee number
      for (const empNum of employeeNumbers) {
        if (!updatedNameMap[empNum]) {
          try {
            console.log(`📞 Fetching name for employee: ${empNum}`);
            const response = await getEmployeeSubordinates(empNum);

            console.log(`📦 Response for ${empNum}:`, response);

            if (response && Array.isArray(response) && response.length > 0) {
              // Find the employee in the response
              const employee = response.find(
                (emp) => (emp.employeeNumber || emp.employeeNo) === empNum
              );

              if (employee) {
                const fullName = `${employee.employeeTitle || ""} ${
                  employee.employeeInitials || ""
                } ${employee.employeeSurname || ""}`.trim();
                updatedNameMap[empNum] =
                  fullName || employee.employeeName || empNum;
                console.log(
                  `✅ Found name for ${empNum}: ${updatedNameMap[empNum]}`
                );
              } else {
                // If not found in response, try the first employee (might be the employee themselves)
                const firstEmp = response[0];
                const fullName = `${firstEmp.employeeTitle || ""} ${
                  firstEmp.employeeInitials || ""
                } ${firstEmp.employeeSurname || ""}`.trim();
                updatedNameMap[empNum] =
                  fullName || firstEmp.employeeName || empNum;
                console.log(
                  `✅ Using first result for ${empNum}: ${updatedNameMap[empNum]}`
                );
              }
            } else {
              console.log(`⚠️ No data returned for ${empNum}`);
              updatedNameMap[empNum] = empNum;
            }
          } catch (error) {
            console.error(`❌ Error fetching name for ${empNum}:`, error);
            updatedNameMap[empNum] = empNum;
          }
        } else {
          console.log(
            `✓ Name already cached for ${empNum}: ${updatedNameMap[empNum]}`
          );
        }
      }

      console.log("✅ Complete employee map:", updatedNameMap);
      setEmployeeMap(updatedNameMap);
      return updatedNameMap;
    } catch (error) {
      console.error("❌ Error in fetchEmployeeNamesForRequests:", error);
      return existingNameMap;
    }
  };

  useEffect(() => {
    // Get current user
    const user = getCurrentUser();
    if (!user) {
      alert("Unable to identify current user. Please log in again.");
      return;
    }
    setCurrentUser(user);
    console.log("Current user in ViewRequest:", user);

    const initializeData = async () => {
      // Fetch all subordinates (including nested ones)
      const { allSubordinates, nameMap } = await fetchAllSubordinates(
        user.employeeNumber
      );

      console.log("✅ All subordinates fetched:", allSubordinates);
      console.log("✅ Subordinate count:", allSubordinates.length);
      console.log("✅ Name map:", nameMap);

      setSubordinateEmployees(allSubordinates);

      // Then fetch requests
      await fetchRequests(user, allSubordinates, nameMap);
    };

    if (user.profile === "erp_employee" && user.employeeNumber) {
      initializeData();
    } else {
      // For non-ERP users, just fetch requests without subordinates
      fetchRequests(user, [], {});
    }
  }, []);

  // ✅ FIXED: Enhanced filtering to include ALL subordinate requests
  const fetchRequests = async (
    user,
    subordinates = [],
    initialNameMap = {}
  ) => {
    try {
      const headers = await createHeaders();
      const res = await fetch(BACKEND_URL, { headers });

      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      console.log("📥 All requests fetched:", data.length);
      console.log("📥 First 3 requests sample:", data.slice(0, 3));

      // ✅ CRITICAL FIX: Build comprehensive identifier set
      const employeeIdentifiers = new Set();
      const employeeNumbers = new Set(); // Separate set for just numbers

      // Add current user identifiers
      if (user.profile === "erp_employee" && user.employeeNumber) {
        employeeIdentifiers.add(user.employeeNumber);
        employeeNumbers.add(user.employeeNumber);
        if (user.name) {
          employeeIdentifiers.add(user.name.toLowerCase());
          employeeIdentifiers.add(user.name.toUpperCase());
        }
      } else {
        if (user.email) employeeIdentifiers.add(user.email.toLowerCase());
        if (user.username) employeeIdentifiers.add(user.username.toLowerCase());
        if (user.name) {
          employeeIdentifiers.add(user.name.toLowerCase());
          employeeIdentifiers.add(user.name.toUpperCase());
        }
      }

      // ✅ Add ALL subordinate identifiers
      subordinates.forEach((emp) => {
        const empNumber = emp.employeeNumber || emp.employeeNo;
        if (empNumber) {
          employeeIdentifiers.add(empNumber);
          employeeNumbers.add(empNumber);

          const fullName = `${emp.employeeTitle || ""} ${
            emp.employeeInitials || ""
          } ${emp.employeeSurname || ""}`.trim();
          if (fullName) {
            employeeIdentifiers.add(fullName.toLowerCase());
            employeeIdentifiers.add(fullName.toUpperCase());
          }
          if (emp.employeeName) {
            employeeIdentifiers.add(emp.employeeName.toLowerCase());
            employeeIdentifiers.add(emp.employeeName.toUpperCase());
          }
        }
      });

      console.log("🔍 Total identifiers to match:", employeeIdentifiers.size);
      console.log("🔍 Employee numbers:", Array.from(employeeNumbers));
      console.log("🔍 All identifiers:", Array.from(employeeIdentifiers));

      // ✅ MOST ROBUST FILTER: Check multiple ways
      const userRequests = data.filter((request) => {
        const assignedBy = String(request.assignedBy || "").trim();
        const assignTo = String(request.assignTo || "").trim();

        // Method 1: Check if assignedBy or assignTo exactly matches any employee number
        if (employeeNumbers.has(assignedBy) || employeeNumbers.has(assignTo)) {
          console.log(`✅ MATCH (exact number): ${request.requestId}`);
          return true;
        }

        // Method 2: Check if any employee number is contained in assignedBy or assignTo
        for (const empNum of employeeNumbers) {
          if (assignedBy.includes(empNum) || assignTo.includes(empNum)) {
            console.log(
              `✅ MATCH (contains number ${empNum}): ${request.requestId}`
            );
            return true;
          }
        }

        // Method 3: Check names (case-insensitive)
        const assignedByLower = assignedBy.toLowerCase();
        const assignToLower = assignTo.toLowerCase();

        for (const identifier of employeeIdentifiers) {
          if (typeof identifier === "string" && !/^\d{6}$/.test(identifier)) {
            if (
              assignedByLower.includes(identifier.toLowerCase()) ||
              assignToLower.includes(identifier.toLowerCase())
            ) {
              console.log(
                `✅ MATCH (name ${identifier}): ${request.requestId}`
              );
              return true;
            }
          }
        }

        console.log(
          `❌ No match: ${request.requestId} | assignedBy: "${assignedBy}" | assignTo: "${assignTo}"`
        );
        return false;
      });

      console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 FILTERING RESULTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total requests in database: ${data.length}
Current user: ${user.name} (${user.employeeNumber})
Subordinates found: ${subordinates.length}
Employee numbers being checked: ${Array.from(employeeNumbers).join(", ")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FILTERED REQUESTS: ${userRequests.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);

      setMyRequests(userRequests);
      await fetchEmployeeNamesForRequests(userRequests, initialNameMap);

      // Show breakdown
      const assignedToCount = userRequests.filter((r) =>
        Array.from(employeeNumbers).some((num) =>
          String(r.assignTo || "").includes(num)
        )
      ).length;
      const assignedFromCount = userRequests.filter((r) =>
        Array.from(employeeNumbers).some((num) =>
          String(r.assignedBy || "").includes(num)
        )
      ).length;

      console.log("📊 Breakdown:");
      console.log(
        `  - Requests assigned TO user/subordinates: ${assignedToCount}`
      );
      console.log(
        `  - Requests assigned FROM user/subordinates: ${assignedFromCount}`
      );
    } catch (error) {
      console.error("Error fetching requests:", error);
      alert(error.message);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedCategory, selectedStatus, selectedEmployee]);

  const getStatusProgress = (status) => {
    const statusMap = {
      Pending: { value: 10, color: "#f59e0b" },
      "In Progress": { value: 40, color: "#3b82f6" },
      "Under Review": { value: 60, color: "#8b5cf6" },
      Approved: { value: 80, color: "#FFC0CB" },
      Completed: { value: 100, color: "#22c55e" },
      Rejected: { value: 100, color: "#ef4444" },
    };
    return statusMap[status] || { value: 0, color: "#9ca3af" };
  };

  const formatDisplayDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString("en-GB") : "";

  const getAssignToDisplay = (assignTo) => {
    if (!assignTo) return "Not Assigned";
    const trimmed = assignTo.trim();
    if (/^\d{6}$/.test(trimmed)) {
      const name = employeeMap[trimmed];
      return name && name !== trimmed ? `${name} (${trimmed})` : trimmed;
    }
    return assignTo;
  };

  const getAssignedByDisplay = (assignedBy) => {
    if (!assignedBy) return "Unknown";
    const trimmed = assignedBy.trim();
    if (/^\d{6}$/.test(trimmed)) {
      const name = employeeMap[trimmed];
      return name && name !== trimmed ? `${name} (${trimmed})` : trimmed;
    }
    return assignedBy;
  };

  const filteredRequestsAll = useMemo(
    () =>
      myRequests.filter((request) => {
        const matchesStartDate =
          !startDate || new Date(request.receivedDate) >= new Date(startDate);
        const matchesEndDate =
          !endDate || new Date(request.receivedDate) <= new Date(endDate);
        const matchesCategory =
          selectedCategory === "All Categories" ||
          request.mainCategory === selectedCategory;
        const matchesStatus =
          selectedStatus === "All Statuses" ||
          request.status === selectedStatus;

        let matchesEmployee = selectedEmployee === "All Employees";
        if (!matchesEmployee) {
          const assignedBy = (request.assignedBy || "").trim();
          const assignTo = (request.assignTo || "").trim();
          matchesEmployee =
            assignedBy.includes(selectedEmployee) ||
            assignTo.includes(selectedEmployee) ||
            (employeeMap[selectedEmployee] &&
              (assignedBy.includes(employeeMap[selectedEmployee]) ||
                assignTo.includes(employeeMap[selectedEmployee])));
        }

        const matchesSearch =
          !searchTerm ||
          request.requestId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getAssignToDisplay(request.assignTo)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          getAssignedByDisplay(request.assignedBy)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          request.mainCategory
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          request.status?.toLowerCase().includes(searchTerm.toLowerCase());

        return (
          matchesStartDate &&
          matchesEndDate &&
          matchesCategory &&
          matchesStatus &&
          matchesEmployee &&
          matchesSearch
        );
      }),
    [
      myRequests,
      startDate,
      endDate,
      selectedCategory,
      selectedStatus,
      selectedEmployee,
      searchTerm,
      employeeMap,
    ]
  );

  const totalPages = Math.ceil(filteredRequestsAll.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequestsAll.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequestsAll, currentPage]);

  const openModal = (request) => setModalRequest({ ...request });
  const closeModal = () => setModalRequest(null);

  const handleChange = (e) =>
    setModalRequest({ ...modalRequest, [e.target.name]: e.target.value });

  const handleSave = async () => {
    if (!modalRequest?.id) return alert("No request selected");
    try {
      const headers = await createHeaders();
      const res = await fetch(`${BACKEND_URL}/${modalRequest.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(modalRequest),
      });

      if (!res.ok) throw new Error("Failed to save changes");

      // ✅ Show success popup with SweetAlert2
      Swal.fire({
        icon: "success",
        title: `REQUEST UPDATED SUCCESSFULLY <br> ${modalRequest.requestId}`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      closeModal();

      // Refresh requests
      const { allSubordinates, nameMap } = await fetchAllSubordinates(
        currentUser.employeeNumber
      );
      await fetchRequests(currentUser, allSubordinates, nameMap);
    } catch (error) {
      console.error("Error saving request:", error);
      // ✅ Show error popup
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
    if (!modalRequest?.id) return alert("No request selected");

    // ✅ Use SweetAlert2 for confirmation
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this request?",
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

      if (!res.ok) throw new Error("Failed to delete request");

      // ✅ Show success popup
      Swal.fire({
        icon: "success",
        title: "REQUEST DELETED SUCCESSFULLY",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      closeModal();

      // Refresh requests
      const { allSubordinates, nameMap } = await fetchAllSubordinates(
        currentUser.employeeNumber
      );
      await fetchRequests(currentUser, allSubordinates, nameMap);
    } catch (error) {
      console.error("Error deleting request:", error);
      // ✅ Show error popup
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.message || "Please try again",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });
    }
  };

  const handleCopy = () => {
    const text = filteredRequestsAll
      .map(
        (req) =>
          `${req.requestId}, ${formatDisplayDate(
            req.receivedDate
          )}, ${getAssignedByDisplay(req.assignedBy)}, ${
            req.mainCategory
          }, ${getAssignToDisplay(req.assignTo)}, ${req.status}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleExportCSV = () => {
    const exportData = filteredRequestsAll.map((req) => ({
      ...req,
      assignTo: getAssignToDisplay(req.assignTo),
      assignedBy: getAssignedByDisplay(req.assignedBy),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requests");
    XLSX.writeFile(wb, "requests.csv");
  };

  const handleExportExcel = () => {
    const exportData = filteredRequestsAll.map((req) => ({
      ...req,
      assignTo: getAssignToDisplay(req.assignTo),
      assignedBy: getAssignedByDisplay(req.assignedBy),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requests");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "requests.xlsx"
    );
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableColumn = [
      "Reference",
      "Created",
      "Assign From",
      "Category",
      "Assign To",
      "Status",
    ];
    const tableRows = filteredRequestsAll.map((req) => [
      req.requestId,
      formatDisplayDate(req.receivedDate),
      getAssignedByDisplay(req.assignedBy),
      req.mainCategory,
      getAssignToDisplay(req.assignTo),
      req.status,
    ]);

    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.text("Request List", 14, 15);
    doc.save("requests.pdf");
  };

  const handlePrint = () => {
    const printContent = document.querySelector(".request-table").outerHTML;
    const newWindow = window.open("", "", "width=800,height=600");
    newWindow.document.write(
      `<html><head><title>Print</title></head><body>${printContent}</body></html>`
    );
    newWindow.document.close();
    newWindow.print();
  };

  return (
    <div className="my-request-container">
      {loading && (
        <div className="fancy-loader">
          <div className="loader-container">
            <div className="loader-box"></div>
            <div className="loader-box"></div>
            <div className="loader-box"></div>
            <div className="loader-box"></div>
          </div>
        </div>
      )}
      {!loading && (
        <>
          <button className="my-request-btn">
            {t("view_requests.button")}
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
              <option>{t("information")}</option>
              <option>{t("tariff_change")}</option>
              <option>{t("organizational_change")}</option>
              <option>{t("policy_update")}</option>
              <option>{t("position_replacement")}</option>
              <option>{t("government_direction")}</option>
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
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="All Employees">All Employees</option>
              <option value={currentUser?.employeeNumber || currentUser?.name}>
                {currentUser?.name} (Me)
              </option>
              {subordinateEmployees.map((emp, idx) => {
                const empNumber = emp.employeeNumber || emp.employeeNo;
                const fullName = `${emp.employeeTitle || ""} ${
                  emp.employeeInitials || ""
                } ${emp.employeeSurname || ""}`.trim();
                return (
                  <option key={idx} value={empNumber}>
                    {fullName} ({empNumber})
                  </option>
                );
              })}
            </select>
            <button className="view-task-button">{t("view_tasks")}</button>
          </div>

          <div className="export-search-section">
            <div className="export-buttons">
              <button onClick={handleCopy}>{t("copy")}</button>
              <button onClick={handleExportCSV}>{t("csv")}</button>
              <button onClick={handleExportExcel}>{t("excel")}</button>
              <button onClick={handleExportPDF}>{t("pdf")}</button>
              <button onClick={handlePrint}>{t("print")}</button>
            </div>

            <input
              type="text"
              className="view-request-search-input"
              placeholder="Search by Reference, Category, Status, or Employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="status-legend">
            <div>
              <span className="legend-box pending"></span> {t("pending")}
            </div>
            <div>
              <span className="legend-box in-progress"></span>{" "}
              {t("in_progress")}{" "}
            </div>
            <div>
              <span className="legend-box under-review"></span>{" "}
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
            {t("showing")} {paginatedRequests.length} {t("of")}{" "}
            {filteredRequestsAll.length} {t("requests")}
            {selectedEmployee !== "All Employees" && (
              <span style={{ marginLeft: "10px", color: "#2563eb" }}>
                (Filtered by:{" "}
                {employeeMap[selectedEmployee] || selectedEmployee})
              </span>
            )}
          </p>

          {paginatedRequests.length === 0 ? (
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
                No Requests Found
              </h3>
              <p style={{ fontSize: "14px", color: "#888" }}>
                {selectedEmployee !== "All Employees"
                  ? `No requests found for ${
                      employeeMap[selectedEmployee] || selectedEmployee
                    } matching the current filters.`
                  : "No requests match the current filters. Try adjusting your filter criteria."}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="request-table">
                <thead>
                  <tr>
                    <th>{t("reference")}</th>
                    <th>{t("created")}</th>
                    <th>{t("assign_from")}</th>
                    <th>{t("main_category")}</th>
                    <th>{t("assign_to")}</th>
                    <th>{t("current_status")}</th>
                    <th>{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((req) => (
                    <tr key={req.id}>
                      <td>{req.requestId}</td>
                      <td>{formatDisplayDate(req.receivedDate)}</td>
                      <td>{getAssignedByDisplay(req.assignedBy)}</td>
                      <td>{req.mainCategory}</td>
                      <td>{getAssignToDisplay(req.assignTo)}</td>
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
                        <button
                          className="view-btn"
                          onClick={() => openModal(req)}
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
            <h3 className="modal-title">View / Edit Request</h3>

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
                      value={modalRequest.requestId}
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
                      onChange={handleChange}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Assign From</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      name="assignedBy"
                      value={getAssignedByDisplay(
                        modalRequest.assignedBy || ""
                      )}
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
                      onChange={handleChange}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Assign To</strong>
                  </td>
                  <td>
                    <input
                      type="text"
                      name="assignTo"
                      value={getAssignToDisplay(modalRequest.assignTo || "")}
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
                <tr>
                  <td>
                    <strong>Status</strong>
                  </td>
                  <td>
                    <select
                      name="status"
                      value={modalRequest.status || ""}
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
              <button className="delete-btn" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewRequest;