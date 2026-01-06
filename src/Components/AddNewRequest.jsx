import { useEffect, useState } from "react";
import Swal from "sweetalert2";
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
    receivedVia: "",
    receivedDate: "",
    receivedTime: "",
    mainCategory: "",
    source: "",
    organization: "",
    requestInBrief: "",
    complaintType: "",
    group: "",
    designation: "",
    assignTo: "",
    remarks: "",
  });

  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryList, setCategoryList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [groupList, setGroupList] = useState([]);
  const [designationList, setDesignationList] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  const [newOrganization, setNewOrganization] = useState("");
  const [organizationList, setOrganizationList] = useState([]);

  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [newAttachment, setNewAttachment] = useState({
    cout: "", // ✅ Base64 file data
    title: "",
    size: "",
    attach: null, // File object for preview
  });

  const [currentUser, setCurrentUser] = useState(null);

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

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    console.log("📌 Current user in AddNewRequest:", user);

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5);

    setFormData((prev) => ({
      ...prev,
      receivedDate: currentDate,
      receivedTime: currentTime,
    }));

    fetchCategories();
    fetchOrganizations();
    fetchERPOrganizations();

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
    }
  };

  const fetchEmployeeHierarchy = async (user = null) => {
    try {
      const currentUserData = user || getCurrentUser();

      if (!currentUserData) {
        console.warn("⚠️ No user data available to fetch hierarchy");
        setUserList([]);
        return;
      }

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

    if (name === "group") {
      handleGroupChange(value);
    }

    if (name === "designation") {
      handleDesignationChange(value);
    }
  };

  const handleGroupChange = async (organizationName) => {
    console.log("🔄 Group changed to:", organizationName);

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

    setFormData((prev) => ({ ...prev, designation: "", assignTo: "" }));
    setEmployeeList([]);

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

    setFormData((prev) => ({ ...prev, assignTo: "" }));

    try {
      const employees = await getEmployeeList(
        selectedOrganizationId,
        costCenter
      );

      if (employees && employees.length > 0) {
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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      Swal.fire({
        title: "Processing file...",
        text: "Please wait",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const base64Data = await convertFileToBase64(file);

      setNewAttachment({
        ...newAttachment,
        cout: base64Data,
        attach: file,
        title: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
      });

      Swal.close();

      console.log("✅ File converted to base64:", {
        fileName: file.name,
        fileSize: file.size,
        base64Length: base64Data.length,
      });
    } catch (error) {
      console.error("❌ Error converting file to base64:", error);
      Swal.fire({
        icon: "error",
        title: "File Processing Error",
        text: "Failed to process the file. Please try again.",
        confirmButtonColor: "#d33",
      });
    }
  };

  const handleAddAttachment = () => {
    if (!newAttachment.title || !newAttachment.size || !newAttachment.cout) {
      Swal.fire({
        icon: "warning",
        title: t("incomplete_attachment"),
        text: "Please select a file and ensure all fields are filled",
        confirmButtonText: t("ok_button"),
        confirmButtonColor: "#f39c12",
      });
      return;
    }

    console.log("📎 Adding attachment with base64 data:", {
      title: newAttachment.title,
      size: newAttachment.size,
      base64Length: newAttachment.cout.length,
    });

    setAttachments([...attachments, newAttachment]);
    setNewAttachment({ cout: "", title: "", size: "", attach: null });
    setShowAttachmentModal(false);
  };

  const handleCloseModal = () => setShowAttachmentModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let assignedBy = "";
    if (currentUser) {
      if (currentUser.profile === "erp_employee") {
        assignedBy = `${currentUser.name} (${currentUser.employeeNumber})`;
      } else {
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

    console.log("📦 Payload:", {
      ...payload,
      attachments: payload.attachments.map((att) => ({
        ...att,
        cout: att.cout ? `[Base64 data: ${att.cout.length} chars]` : "null",
      })),
    });

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

      setFormData({
        requestId: "",
        receivedVia: "",
        receivedDate: "",
        receivedTime: "",
        mainCategory: "",
        source: "",
        organization: "",
        requestInBrief: "",
        complaintType: "",
        group: "",
        designation: "",
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
                      required
                    >
                      <option value="">{t("Select") || "SELECT"}</option>
                      <option value="Registered Post">
                        {t("registered_post")}
                      </option>
                      <option value="On Arrival">{t("on_arrival")}</option>
                      <option value="Email">{t("email")}</option>
                    </select>
                  </div>
                </div>

                <div className="form-group date">
                  <label>{t("received_date")}</label>
                  <input
                    type="date"
                    name="receivedDate"
                    value={formData.receivedDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group time">
                  <label>{t("time")}</label>
                  <input
                    type="time"
                    name="receivedTime"
                    value={formData.receivedTime}
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
                      required
                    >
                      <option value="">
                        {t("Select Category") || "SELECT CATEGORY"}
                      </option>
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
                    placeholder={t("Source")}
                  />
                </div>

                <div className="form-group received-form">
                  <label> {t("received_organization")}</label>
                  <div className="select-with-button">
                    <select
                      name="organization"
                      value={formData.organization}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">
                        {t("Select Organization") || "SELECT ORGANIZATION"}
                      </option>
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
                      required
                    >
                      <option value="">{t("Select") || "SELECT"}</option>
                      <option value="Request Forwarded">
                        {t("request_forwarded")}
                      </option>
                      <option value="Request Resolved">
                        {t("request_resolved")}
                      </option>
                      <option value="Request Rejected">
                        {t("request_rejected")}
                      </option>
                    </select>
                  </div>
                </div>

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
                      placeholder={t("nothing_selected") || "SELECT"}
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

                <div className="form-group">
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
                          ? t("Select") || "SELECT"
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
                          ? t("select") || "SELECT"
                          : "Select Group first"}
                      </option>
                      {employeeList
                        .filter((employee) => {
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
            <input type="file" accept="*/*" onChange={handleFileChange} />

            <table>
              <thead>
                <tr>
                  <th>{t("title")}</th>
                  <th>{t("size")}</th>
                  <th>{t("attach")}</th>
                  <th>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((att, index) => (
                  <tr key={index}>
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
