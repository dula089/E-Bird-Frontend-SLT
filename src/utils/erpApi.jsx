import { getAccessToken } from "./authUtils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ERP_PROXY_URL = `${API_BASE_URL}/api/erp`;

// Helper to create headers with auth token for backend proxy
const createHeaders = async () => {
  const token = await getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// ✅ Get all organizations from ERP - using backend proxy (PUBLIC - NO AUTH)
export const getOrganizationList = async () => {
  try {
    console.log("🔍 Fetching organization list from ERP");

    const response = await fetch(`${ERP_PROXY_URL}/organizations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ ERP Organizations fetched:", result);

    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error("❌ Error fetching ERP organizations:", error);
    throw error;
  }
};

// ✅ Get cost centers for a specific organization - using backend proxy (PUBLIC - NO AUTH)
export const getCostCentersForOrganization = async (
  organizationID,
  costCenterCode = ""
) => {
  try {
    console.log("🔍 Fetching cost centers for organization:", organizationID);

    const response = await fetch(`${ERP_PROXY_URL}/cost-centers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationID: organizationID.toString(),
        costCenterCode: costCenterCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Cost centers fetched:", result);

    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error("❌ Error fetching cost centers:", error);
    throw error;
  }
};

// ✅ Get employee list for given organization and cost center - using backend proxy (PUBLIC - NO AUTH)
export const getEmployeeList = async (organizationID, costCenterCode) => {
  try {
    console.log(
      "🔍 Fetching employees for org:",
      organizationID,
      "cost center:",
      costCenterCode
    );

    const response = await fetch(`${ERP_PROXY_URL}/employees`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationID: organizationID.toString(),
        costCenterCode: costCenterCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Employees fetched:", result);

    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    return [];
  } catch (error) {
    console.error("❌ Error fetching employee list:", error);
    throw error;
  }
};

// ✅ Get employee hierarchy - using backend proxy (PUBLIC - NO AUTH)
export const getEmployeeHierarchy = async (
  employeeNo,
  organizationID = "string",
  costCenterCode = "string"
) => {
  try {
    console.log("🔍 Calling employee hierarchy API for:", employeeNo);

    const response = await fetch(`${ERP_PROXY_URL}/employee-hierarchy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationID,
        costCenterCode,
        employeeNo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Employee hierarchy API response:", result);

    return result;
  } catch (error) {
    console.error("❌ Error fetching employee hierarchy:", error);
    throw error;
  }
};

// ✅ Get employee subordinates details - using backend proxy (PUBLIC - NO AUTH)
export const getEmployeeSubordinates = async (employeeNo) => {
  try {
    console.log("🔍 Fetching employee subordinates for:", employeeNo);

    const response = await fetch(`${ERP_PROXY_URL}/employee-subordinates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeNo: employeeNo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Employee subordinates fetched:", result);

    // Handle the API response structure
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    // If response is directly an array
    if (Array.isArray(result)) {
      return result;
    }

    return [];
  } catch (error) {
    console.error("❌ Error fetching employee subordinates:", error);
    throw error;
  }
};

// ✅ Public login endpoint - using backend proxy (NO AUTH REQUIRED)
export const loginWithEmployeeNumber = async (employeeNo) => {
  try {
    console.log("🔍 Attempting login for employee:", employeeNo);

    const response = await fetch(`${ERP_PROXY_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationID: "string",
        costCenterCode: "string",
        employeeNo: employeeNo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Login API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Employee login successful:", result);

    return result;
  } catch (error) {
    console.error("❌ Error during employee login:", error);
    throw error;
  }
};

// ============================================================================
// ALTERNATIVE: DIRECT ERP API CALLS (If backend proxy is not available)
// ============================================================================

// ✅ Get employee subordinates details - DIRECT ERP CALL (PUBLIC - NO AUTH)
export const getEmployeeSubordinatesDirect = async (employeeNo) => {
  try {
    console.log("🔍 Fetching employee subordinates (direct) for:", employeeNo);

    const response = await fetch(
      `https://oneidentitytest.slt.com.lk/ERPAPIs/api/ERPData/GetEmployeeSubordinatesDetailsList`,
      {
        method: "POST",
        headers: {
          accept: "text/plain",
          "Content-Type": "application/json",
          UserName: "dpuser",
          Password: "dp@123#",
        },
        body: JSON.stringify({
          employeeNo: employeeNo,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Employee subordinates fetched (direct):", result);

    // Handle the API response structure
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    // If response is directly an array
    if (Array.isArray(result)) {
      return result;
    }

    return [];
  } catch (error) {
    console.error("❌ Error fetching employee subordinates (direct):", error);
    throw error;
  }
};
