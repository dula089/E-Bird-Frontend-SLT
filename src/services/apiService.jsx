// // import axios from "axios";
// // import { authService } from "./authService";

// // const API_BASE_URL = "http://localhost:8080";

// // const api = axios.create({
// //   baseURL: API_BASE_URL,
// //   headers: {
// //     "Content-Type": "application/json",
// //   },
// // });

// // api.interceptors.request.use(
// //   async (config) => {
// //     try {
// //       const token = await authService.getAccessToken();
// //       if (token) {
// //         config.headers.Authorization = `Bearer ${token}`;
// //       }
// //     } catch (error) {
// //       console.error("Failed to get access token:", error);
// //     }
// //     return config;
// //   },
// //   (error) => {
// //     return Promise.reject(error);
// //   }
// // );

// // api.interceptors.response.use(
// //   (response) => response,
// //   async (error) => {
// //     const originalRequest = error.config;

// //     if (error.response?.status === 401 && !originalRequest._retry) {
// //       originalRequest._retry = true;

// //       try {
// //         const token = await authService.getAccessToken();
// //         originalRequest.headers.Authorization = `Bearer ${token}`;
// //         return api(originalRequest);
// //       } catch (refreshError) {
// //         window.location.href = "/";
// //         return Promise.reject(refreshError);
// //       }
// //     }

// //     return Promise.reject(error);
// //   }
// // );

// // export const apiService = {
// //   validateToken: () => api.get("/api/auth/validate"),
// //   getUserInfo: () => api.get("/api/auth/user"),

// //   createRequest: (data) => api.post("/AddNewRequest", data),
// //   getAllRequests: () => api.get("/AddNewRequest"),
// //   getRequestById: (id) => api.get(`/AddNewRequest/${id}`),
// //   updateRequest: (id, data) => api.put(`/AddNewRequest/${id}`, data),
// //   deleteRequest: (id) => api.delete(`/AddNewRequest/${id}`),
// //   generateRequestId: () => api.get("/AddNewRequest/generateRequestId"),

// //   getAllCategories: () => api.get("/Categories"),
// //   getAllOrganizations: () => api.get("/Categories/Organizations"),
// //   createCategory: (data) => api.post("/Categories", data),
// //   updateCategory: (id, data) => api.put(`/Categories/${id}`, data),
// //   deleteCategory: (id) => api.delete(`/Categories/${id}`),
// // };

// // export default api;

// import axios from "axios";
// import { authService } from "./authService";

// // ✅ Make sure the backend base URL matches your Spring Boot server URL
// const API_BASE_URL =
//   import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/";

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// // ✅ Request interceptor - safely add token only if available
// api.interceptors.request.use(
//   async (config) => {
//     try {
//       const token = await authService.getAccessToken();
//       console.log("Access Token:", token ? "Token found ✅" : "No token ⚠️");

//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     } catch (error) {
//       console.error("Error retrieving access token:", error);
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // ✅ Response interceptor for handling unauthorized requests
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;

//       try {
//         const token = await authService.getAccessToken();
//         if (token) {
//           originalRequest.headers.Authorization = `Bearer ${token}`;
//           return api(originalRequest);
//         }
//       } catch (refreshError) {
//         console.error("Token refresh failed:", refreshError);
//         window.location.href = "/";
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// // ✅ All your API endpoints
// export const apiService = {
//   validateToken: () => api.get("/auth/validate"),
//   getUserInfo: () => api.get("/auth/user"),

//   // Request endpoints
//   createRequest: (data) => api.post("/AddNewRequest", data),
//   getAllRequests: () => api.get("/AddNewRequest"),
//   getRequestById: (id) => api.get(`/AddNewRequest/${id}`),
//   updateRequest: (id, data) => api.put(`/AddNewRequest/${id}`, data),
//   deleteRequest: (id) => api.delete(`/AddNewRequest/${id}`),
//   generateRequestId: () => api.get("/AddNewRequest/generateRequestId"),

//   // Category + Organization endpoints
//   getAllCategories: () => api.get("/Categories"),
//   getAllOrganizations: () => api.get("/Categories/Organizations"),
//   createCategory: (data) => api.post("/Categories", data),
//   updateCategory: (id, data) => api.put(`/Categories/${id}`, data),
//   deleteCategory: (id) => api.delete(`/Categories/${id}`),
// };

// export default api;

import { authService } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiService = {
  async fetchWithAuth(url, options = {}) {
    try {
      const token = await authService.getAccessToken();

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token expired or invalid, try to refresh
        await authService.loginRedirect();
        throw new Error("Authentication required");
      }

      return response;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  },

  async get(endpoint) {
    const response = await this.fetchWithAuth(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  async post(endpoint, data) {
    const response = await this.fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  async put(endpoint, data) {
    const response = await this.fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`PUT ${endpoint} failed: ${response.statusText}`);
    }
    return response.json();
  },

  async delete(endpoint) {
    const response = await this.fetchWithAuth(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`DELETE ${endpoint} failed: ${response.statusText}`);
    }
    return response.ok;
  },
};
