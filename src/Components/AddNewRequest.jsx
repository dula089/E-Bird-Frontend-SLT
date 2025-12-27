import { useEffect, useState } from "react";
import Swal from "sweetalert2";
// import "../index.css";
import "../Components/RequestCSS/AddNew.css";
import { useTranslation } from "react-i18next";
import { getAccessToken } from "../utils/authUtils";
import { getCurrentUser } from "../utils/userUtils";
import {
  getEmployeeHierarchy,
  getOrganizationList,
  getCostCentersForOrganization,
  getEmployeeList,
} from "../utils/erpApi";
import SearchableDropdown from "./SearchableDropdown/SearchableDropdown";

const AddNewRequest = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    requestId: "",
    receivedVia: "Registered Post",
    receivedDate: "",
    receivedTime: "",
    mainCategory: "Information",
    source: "",
    organization: "President Office",
    requestInBrief: "",
    complaintType: "Request Forwarded",
    group: "",
    designation: "Chief Officer",
    assignTo: "",
    remarks: "",
  });

  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryList, setCategoryList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [groupList, setGroupList] = useState([]); // ✅ ERP Organizations for Group
  const [designationList, setDesignationList] = useState([]); // ✅ Cost Centers/Divisions
  const [employeeList, setEmployeeList] = useState([]); // ✅ Employees by group
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(""); // ✅ Track selected org ID

  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  const [newOrganization, setNewOrganization] = useState("");
  const [organizationList, setOrganizationList] = useState([]);

  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [newAttachment, setNewAttachment] = useState({
    cout: "",
    title: "",
    size: "",
    attach: null,
  });

  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Smart header creation function - handles both Azure and ERP users
  const createHeaders = async () => {
    const user = getCurrentUser();
    const headers = {
      "Content-Type": "application/json",
    };

    // Only add Authorization header for Azure users
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

  useEffect(() => {
    // Get current user
    const user = getCurrentUser();
    setCurrentUser(user);
    console.log("📌 Current user in AddNewRequest:", user);

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD format
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    setFormData((prev) => ({
      ...prev,
      receivedDate: currentDate,
      receivedTime: currentTime,
    }));

    fetchCategories();
    fetchOrganizations();
    fetchERPOrganizations(); // ✅ Fetch ERP organizations for Group field

    // ✅ Fetch employee hierarchy based on user type
    if (user) {
      fetchEmployeeHierarchy(user);
    } else {
      console.warn("⚠️ No user found in session");
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const headers = await createHeaders();
      const response = await fetch(`${API_BASE_URL}/Categories`, { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCategoryList(data);
      console.log("✅ Categories fetched:", data.length);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch categories: " + error.message,
      });
    }
  };

  const fetchOrganizations = async () => {
    try {
      const headers = await createHeaders();
      const response = await fetch(`${API_BASE_URL}/Categories/Organizations`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOrganizationList(data);
      console.log("✅ Organizations fetched:", data.length);
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    }
  };

  // ✅ NEW: Fetch ERP Organizations for Group dropdown
  const fetchERPOrganizations = async () => {
    try {
      console.log("📞 Fetching ERP organization list for Group field...");
      const data = await getOrganizationList();

      if (data && Array.isArray(data)) {
        setGroupList(data);
        console.log(
          "✅ ERP Organizations loaded for Group:",
          data.length,
          "organizations"
        );

        if (data.length > 0) {
          console.log(
            "🏢 Available groups:",
            data.map((org) => org.organizationName || org.name).join(", ")
          );
        }
      } else {
        console.warn("⚠️ Invalid ERP organization data received");
        setGroupList([]);
      }
    } catch (error) {
      console.error("❌ Failed to fetch ERP organizations:", error);
      setGroupList([]);

      // Optional: Show user-friendly warning (comment out if not needed)
      /*
      Swal.fire({
        icon: "info",
        title: "Organization List",
        text: "Could not load organization list for Group field. You can still submit the form.",
        confirmButtonColor: "#3085d6",
        timer: 3000,
      });
      */
    }
  };

  // ✅ Fetch employee hierarchy from ERP
  const fetchEmployeeHierarchy = async (user = null) => {
    try {
      const currentUserData = user || getCurrentUser();

      if (!currentUserData) {
        console.warn("⚠️ No user data available to fetch hierarchy");
        setUserList([]);
        return;
      }

      // Get employee number based on user type
      let employeeNo = "";

      if (currentUserData.profile === "erp_employee") {
        employeeNo = currentUserData.employeeNumber;
        console.log(
          "👤 ERP User detected:",
          currentUserData.name,
          "Employee #:",
          employeeNo
        );
      } else if (currentUserData.employeeNumber) {
        employeeNo = currentUserData.employeeNumber;
        console.log(
          "👤 Azure User with employee number:",
          currentUserData.name,
          "Employee #:",
          employeeNo
        );
      } else {
        console.warn(
          "⚠️ User without employee number. Cannot fetch hierarchy."
        );
        setUserList([]);
        return;
      }

      // Validate employee number
      if (!employeeNo || employeeNo.trim() === "") {
        console.error("❌ Invalid employee number:", employeeNo);
        setUserList([]);
        return;
      }

      console.log("📞 Fetching employee hierarchy for:", employeeNo);

      const response = await getEmployeeHierarchy(
        employeeNo,
        "string",
        "string"
      );

      console.log("📥 Employee hierarchy response:", response);

      if (
        response &&
        response.success &&
        response.data &&
        Array.isArray(response.data)
      ) {
        // Transform ERP data to match the format expected by the dropdown
        const employees = response.data.map((emp) => ({
          id: emp.employeeNumber,
          email: emp.employeeNumber,
          name: emp.employeeName,
          designation: emp.designation,
          employeeNumber: emp.employeeNumber,
          gradeName: emp.gradeName,
          supervisorNumber: emp.employeeSupervisorNumber,
        }));

        setUserList(employees);
        console.log(
          "✅ Employee hierarchy loaded:",
          employees.length,
          "employees"
        );

        if (employees.length > 0) {
          console.log(
            "👥 Available employees:",
            employees.map((e) => `${e.name} (${e.employeeNumber})`).join(", ")
          );
        }
      } else {
        console.error(
          "❌ Invalid response from employee hierarchy API:",
          response
        );
        setUserList([]);
      }
    } catch (error) {
      console.error("❌ Failed to fetch employee hierarchy:", error);
      setUserList([]);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setLoading(true);
    try {
      const headers = await createHeaders();
      const res = await fetch(`${API_BASE_URL}/Categories`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newCategory, type: "category" }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      setCategoryList((prev) => [...prev, result]);
      setNewCategory("");
      setShowCategoryModal(false);

      Swal.fire({
        icon: "success",
        title: "Category Added",
        text: `${newCategory} has been added successfully`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error adding category:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to add category: " + error.message,
      });
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const handleAddOrganization = async () => {
    if (!newOrganization.trim()) return;
    setLoading(true);
    try {
      const headers = await createHeaders();
      const res = await fetch(`${API_BASE_URL}/Categories`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newOrganization, type: "organization" }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      setOrganizationList((prev) => [...prev, result]);
      setNewOrganization("");
      setShowOrganizationModal(false);

      Swal.fire({
        icon: "success",
        title: "Organization Added",
        text: `${newOrganization} has been added successfully`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error adding organization:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to add organization: " + error.message,
      });
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // ✅ When Group changes, fetch cost centers and reset dependent fields
    if (name === "group") {
      handleGroupChange(value);
    }

    // ✅ When Designation changes, fetch employees for that cost center
    if (name === "designation") {
      handleDesignationChange(value);
    }
  };

  // ✅ Handle Group selection change
  const handleGroupChange = async (organizationName) => {
    console.log("🔄 Group changed to:", organizationName);

    // Find the selected organization object to get its ID
    const selectedOrg = groupList.find(
      (org) => (org.organizationName || org.name) === organizationName
    );

    if (!selectedOrg) {
      console.warn("⚠️ Organization not found in list");
      setDesignationList([]);
      setEmployeeList([]);
      setFormData((prev) => ({ ...prev, designation: "", assignTo: "" }));
      return;
    }

    const orgId = selectedOrg.organizationId;
    console.log("📌 Selected organization ID:", orgId);
    setSelectedOrganizationId(orgId);

    // Reset dependent fields
    setFormData((prev) => ({ ...prev, designation: "", assignTo: "" }));
    setEmployeeList([]);

    // Fetch cost centers for this organization
    try {
      const costCenters = await getCostCentersForOrganization(orgId, "");

      if (costCenters && costCenters.length > 0) {
        setDesignationList(costCenters);
        console.log("✅ Cost centers loaded:", costCenters.length, "divisions");
      } else {
        console.warn("⚠️ No cost centers found for organization:", orgId);
        setDesignationList([]);
      }
    } catch (error) {
      console.error("❌ Error fetching cost centers:", error);
      setDesignationList([]);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load designations for selected group",
        confirmButtonColor: "#d33",
        timer: 3000,
      });
    }
  };

  // ✅ Handle Designation selection change
  const handleDesignationChange = async (costCenter) => {
    console.log("🔄 Designation changed to:", costCenter);

    if (!selectedOrganizationId) {
      console.warn("⚠️ No organization selected");
      return;
    }

    if (!costCenter) {
      setEmployeeList([]);
      return;
    }

    // Reset assign to field
    setFormData((prev) => ({ ...prev, assignTo: "" }));

    // Fetch employees for this organization and cost center
    try {
      const employees = await getEmployeeList(
        selectedOrganizationId,
        costCenter
      );

      if (employees && employees.length > 0) {
        // Transform employee data
        const transformedEmployees = employees.map((emp) => ({
          id: emp.employeeNumber,
          email: emp.employeeNumber,
          name: emp.employeeName,
          designation: emp.designation,
          employeeNumber: emp.employeeNumber,
          gradeName: emp.gradeName,
        }));

        setEmployeeList(transformedEmployees);
        console.log(
          "✅ Employees loaded:",
          transformedEmployees.length,
          "employees"
        );
        console.log(
          "👥 Available:",
          transformedEmployees.map((e) => e.name).join(", ")
        );
      } else {
        console.warn("⚠️ No employees found for cost center:", costCenter);
        setEmployeeList([]);
      }
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
      setEmployeeList([]);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load employees for selected designation",
        confirmButtonColor: "#d33",
        timer: 3000,
      });
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachment.cout || !newAttachment.title || !newAttachment.size) {
      Swal.fire({
        icon: "warning",
        title: t("incomplete_attachment"),
        text: t("please_fill_attachment_fields"),
        confirmButtonText: t("ok_button"),
        confirmButtonColor: "#f39c12",
      });
      return;
    }
    setAttachments([...attachments, newAttachment]);
    setNewAttachment({ cout: "", title: "", size: "", attach: null });
    setShowAttachmentModal(false);
  };

  const handleCloseModal = () => setShowAttachmentModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Get assigned by info based on user type
    let assignedBy = "";
    if (currentUser) {
      if (currentUser.profile === "erp_employee") {
        // ERP user - use employee name and number
        assignedBy = `${currentUser.name} (${currentUser.employeeNumber})`;
      } else {
        // Azure user - use name
        assignedBy = currentUser.name || currentUser.email;
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Authentication Error",
        text: "Unable to identify current user. Please log in again.",
        confirmButtonColor: "#d33",
      });
      return;
    }

    console.log("📤 Submitting request with assignedBy:", assignedBy);

    const payload = {
      ...formData,
      assignedBy: assignedBy,
      attachments: attachments.map((att) => ({
        cout: att.cout,
        title: att.title,
        size: att.size,
        attachName: att.title,
      })),
    };

    console.log("📦 Payload:", payload);

    try {
      const headers = await createHeaders();

      const response = await fetch(`${API_BASE_URL}/AddNewRequest`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Request created successfully:", result);

      Swal.fire({
        icon: "success",
        title: `REQUEST SUBMITTED SUCCESSFULLY <br> ${result.requestId}`,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      // Reset form
      setFormData({
        requestId: "",
        receivedVia: "Registered Post",
        receivedDate: "",
        receivedTime: "",
        mainCategory: "Information",
        source: "",
        organization: "President Office",
        requestInBrief: "",
        complaintType: "Request Forwarded",
        group: "",
        designation: "Chief Officer",
        assignTo: "",
        remarks: "",
      });
      setAttachments([]);
    } catch (error) {
      console.error("❌ Submission error:", error);
      Swal.fire({
        icon: "error",
        title: t("submission_failed_title") || "Submission Failed",
        text:
          error.message || t("submission_failed_text") || "Please try again",
        confirmButtonText: t("ok_button") || "OK",
        confirmButtonColor: "#d33",
      });
    }
  };

  return (
    <div className="request-form-container">
      <button className="add-new-btn">{t("add_new_requests.button")}</button>

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
        <form onSubmit={handleSubmit}>
          <div className="form-section1">
            <div className="form-section-request">
              <div className="form-row">
                <div className="form-group">
                  <label>{t("received_via")}</label>
                  <div className="select-with-button">
                    <select
                      name="receivedVia"
                      value={formData.receivedVia}
                      onChange={handleInputChange}
                    >
                      <option>{t("registered_post")}</option>
                      <option>{t("on_arrival")}</option>
                      <option>{t("email")}</option>
                    </select>
                  </div>
                </div>

                <div className="form-group date">
                  <label>{t("received_date")}</label>
                  <input
                    type="date"
                    name="receivedDate"
                    value={formData.receivedDate} // ✅ Will show current date
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group time">
                  <label>{t("time")}</label>
                  <input
                    type="time"
                    name="receivedTime"
                    value={formData.receivedTime} // ✅ Will show current time
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group main-category">
                  <label>{t("main_category")}</label>
                  <div className="select-with-button">
                    <select
                      name="mainCategory"
                      value={formData.mainCategory}
                      onChange={handleInputChange}
                    >
                      {categoryList.map((cat, index) => (
                        <option key={index} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="plus-btn"
                      onClick={() => setShowCategoryModal(true)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group source-group">
                  <label>
                    {t("received_source")} <br />
                    <small>{t("received_source_desc")}</small>
                  </label>
                  <input
                    type="text"
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    placeholder={t("source")}
                  />
                  {/* <a href="#" className="view-history">
                    {t("view_history")}
                  </a> */}
                </div>

                <div className="form-group received-form">
                  <label> {t("received_organization")}</label>
                  <div className="select-with-button">
                    <select
                      name="organization"
                      value={formData.organization}
                      onChange={handleInputChange}
                    >
                      {organizationList.map((org, index) => (
                        <option key={index} value={org.name}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="plus-btn"
                      onClick={() => setShowOrganizationModal(true)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group-textarea1">
                <label> {t("request_in_brief")}</label>
                <textarea
                  name="requestInBrief"
                  value={formData.requestInBrief}
                  onChange={handleInputChange}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-request1">
              <div className="form-row">
                <div className="form-group">
                  <label> {t("complaint_type")}</label>
                  <div className="select-with-button">
                    <select
                      name="complaintType"
                      value={formData.complaintType}
                      onChange={handleInputChange}
                    >
                      <option>{t("request_forwarded")}</option>
                      <option>{t("request_resolved")}</option>
                      <option>{t("request_rejected")}</option>
                    </select>
                  </div>
                </div>

                {/* ✅ Group dropdown with ERP Organizations */}
                <div className="form-group">
                  <label>{t("section")}</label>
                  <div className="select-with-button">
                    <SearchableDropdown
                      options={groupList}
                      value={formData.group}
                      onChange={(value) => {
                        setFormData({ ...formData, group: value });
                        handleGroupChange(value);
                      }}
                      placeholder={t("nothing_selected")}
                      displayKey="organizationName"
                      valueKey="organizationName"
                    />
                  </div>
                  {groupList.length === 0 && (
                    <small
                      style={{
                        color: "#888",
                        fontSize: "11px",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Loading organizations...
                    </small>
                  )}
                </div>

                {/* ✅ Designation dropdown - populated after Group selection */}
                <div className="form-group">
                  {/* <label>{t("designation")}</label> */}
                  <label>{t("group")}</label>
                  <div className="select-with-button">
                    <select
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      disabled={!formData.group}
                    >
                      <option value="">
                        {formData.group
                          ? t("nothing_selected")
                          : "Select Section first"}
                      </option>
                      {designationList.map((cc, index) => (
                        <option key={index} value={cc.costCenter}>
                          {cc.division} ({cc.costCenter})
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.group && designationList.length === 0 && (
                    <small
                      style={{
                        color: "#888",
                        fontSize: "11px",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Loading designations...
                    </small>
                  )}
                </div>

                {/* ✅ Assign To dropdown - populated after Designation selection */}
                <div className="form-group">
                  <label>{t("assign_to")}</label>
                  <div className="select-with-button">
                    <select
                      name="assignTo"
                      value={formData.assignTo}
                      onChange={handleInputChange}
                      disabled={!formData.designation}
                    >
                      <option value="">
                        {formData.designation
                          ? t("nothing_selected")
                          : "Select Group first"}
                      </option>
                      {employeeList
                        .filter((employee) => {
                          // Filter out current user from the list
                          if (!currentUser) return true;
                          return (
                            employee.employeeNumber !==
                            currentUser.employeeNumber
                          );
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
                  </div>
                  {formData.designation && employeeList.length === 0 && (
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
                  {formData.designation &&
                    employeeList.filter(
                      (emp) =>
                        !currentUser ||
                        emp.employeeNumber !== currentUser.employeeNumber
                    ).length === 0 &&
                    employeeList.length > 0 && (
                      <small
                        style={{
                          color: "#888",
                          fontSize: "11px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        No other employees available
                      </small>
                    )}
                </div>

                <div className="form-group-textarea">
                  <label>{t("remarks")}</label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="attachment-btn"
              onClick={() => setShowAttachmentModal(true)}
            >
              {t("add_attachment")}
            </button>
            <button type="submit" className="submit-btn">
              {t("submit_request")}
            </button>
          </div>
        </form>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="category-modal-overlay">
          <div className="category-modal-content">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t("category_name")}
            />
            <div className="category-modal-buttons">
              <button className="category-add-btn" onClick={handleAddCategory}>
                {t("add_category")}
              </button>
              <button
                className="category-cancel-btn"
                onClick={() => setShowCategoryModal(false)}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Modal */}
      {showOrganizationModal && (
        <div className="category-modal-overlay">
          <div className="category-modal-content">
            <input
              type="text"
              value={newOrganization}
              onChange={(e) => setNewOrganization(e.target.value)}
              placeholder={t("organization_name")}
            />
            <div className="category-modal-buttons">
              <button
                className="category-add-btn"
                onClick={handleAddOrganization}
              >
                {t("add_organization")}
              </button>
              <button
                className="category-cancel-btn"
                onClick={() => setShowOrganizationModal(false)}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modal */}
      {showAttachmentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <button className="modal-close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder={t("attachment_cout")}
              value={newAttachment.cout}
              onChange={(e) =>
                setNewAttachment({ ...newAttachment, cout: e.target.value })
              }
            />
            <input
              type="text"
              placeholder={t("attachment_title")}
              value={newAttachment.title}
              onChange={(e) =>
                setNewAttachment({ ...newAttachment, title: e.target.value })
              }
            />
            <input
              type="text"
              placeholder={t("attachment_size")}
              value={newAttachment.size}
              onChange={(e) =>
                setNewAttachment({ ...newAttachment, size: e.target.value })
              }
            />
            <input
              type="file"
              accept="*/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setNewAttachment({
                    ...newAttachment,
                    attach: file,
                    title: file.name,
                    size: (file.size / 1024).toFixed(2) + " KB",
                  });
                }
              }}
            />

            <table>
              <thead>
                <tr>
                  <th>{t("cout")}</th>
                  <th>{t("title")}</th>
                  <th>{t("size")}</th>
                  <th>{t("attach")}</th>
                  <th>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((att, index) => (
                  <tr key={index}>
                    <td>{att.cout}</td>
                    <td>{att.title}</td>
                    <td>{att.size}</td>
                    <td>
                      {att.attach?.type?.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(att.attach)}
                          alt={att.title}
                          style={{ width: "50px", height: "auto" }}
                        />
                      ) : (
                        att.attach?.name || "N/A"
                      )}
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => {
                          const updated = attachments.filter(
                            (_, i) => i !== index
                          );
                          setAttachments(updated);
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-buttons">
              <button className="add-btn" onClick={handleAddAttachment}>
                {t("add_attachment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddNewRequest;
