// import { msalInstance, loginRequest } from "../config/azureConfig";

// let tokenPromise = null;

// export const getAccessToken = async () => {
//   // Prevent concurrent token requests
//   if (tokenPromise) {
//     return tokenPromise;
//   }

//   try {
//     const accounts = msalInstance.getAllAccounts();

//     if (accounts.length === 0) {
//       throw new Error("No accounts found. Please sign in.");
//     }

//     tokenPromise = msalInstance
//       .acquireTokenSilent({
//         ...loginRequest,
//         account: accounts[0],
//       })
//       .then((response) => {
//         tokenPromise = null;
//         return response.accessToken;
//       })
//       .catch(async (error) => {
//         tokenPromise = null;

//         if (error.name === "InteractionRequiredAuthError") {
//           // Fallback to interactive login
//           const response = await msalInstance.acquireTokenPopup(loginRequest);
//           return response.accessToken;
//         }
//         throw error;
//       });

//     return await tokenPromise;
//   } catch (error) {
//     tokenPromise = null;
//     console.error("Error acquiring token:", error);
//     throw error;
//   }
// };

// CODE FOR -   Auto-Register Users on First Login (want to CHANGE UserController,UserService,frontend AuthUtils.jsx)

// import { msalInstance, loginRequest } from "../config/azureConfig";

// let tokenPromise = null;

// export const getAccessToken = async () => {
//   if (tokenPromise) {
//     return tokenPromise;
//   }

//   try {
//     const accounts = msalInstance.getAllAccounts();

//     if (accounts.length === 0) {
//       throw new Error("No accounts found. Please sign in.");
//     }

//     tokenPromise = msalInstance
//       .acquireTokenSilent({
//         ...loginRequest,
//         account: accounts[0],
//       })
//       .then((response) => {
//         tokenPromise = null;

//         // ✅ Auto-register user after getting token
//         registerUserInBackground(response.accessToken);

//         return response.accessToken;
//       })
//       .catch(async (error) => {
//         tokenPromise = null;

//         if (error.name === "InteractionRequiredAuthError") {
//           const response = await msalInstance.acquireTokenPopup(loginRequest);

//           // ✅ Auto-register user after getting token
//           registerUserInBackground(response.accessToken);

//           return response.accessToken;
//         }
//         throw error;
//       });

//     return await tokenPromise;
//   } catch (error) {
//     tokenPromise = null;
//     console.error("Error acquiring token:", error);
//     throw error;
//   }
// };

// // Background registration - doesn't block token acquisition
// const registerUserInBackground = async (token) => {
//   try {
//     const response = await fetch(
//       `${import.meta.env.VITE_API_BASE_URL}/api/users/register-or-login`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     if (response.ok) {
//       const user = await response.json();
//       console.log("✅ User auto-registered:", user.name);
//     }
//   } catch (error) {
//     console.log("ℹ️ Background user registration skipped:", error.message);
//   }
// };

import { msalInstance, loginRequest } from "../config/azureConfig";

let tokenPromise = null;

export const getAccessToken = async () => {
  // ✅ Check if user is ERP user (no Azure authentication)
  const currentUser = getCurrentUserFromStorage();
  if (currentUser && currentUser.profile === "erp_employee") {
    // ERP users don't need Azure token
    console.log("🔍 ERP user detected - skipping token acquisition");
    return null;
  }

  if (tokenPromise) {
    return tokenPromise;
  }

  try {
    const accounts = msalInstance.getAllAccounts();

    if (accounts.length === 0) {
      throw new Error("No accounts found. Please sign in.");
    }

    tokenPromise = msalInstance
      .acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      })
      .then((response) => {
        tokenPromise = null;

        // Auto-register user after getting token
        registerUserInBackground(response.accessToken);

        return response.accessToken;
      })
      .catch(async (error) => {
        tokenPromise = null;

        if (error.name === "InteractionRequiredAuthError") {
          const response = await msalInstance.acquireTokenPopup(loginRequest);

          // Auto-register user after getting token
          registerUserInBackground(response.accessToken);

          return response.accessToken;
        }
        throw error;
      });

    return await tokenPromise;
  } catch (error) {
    tokenPromise = null;
    console.error("Error acquiring token:", error);
    throw error;
  }
};

// Background registration - doesn't block token acquisition
const registerUserInBackground = async (token) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/users/register-or-login`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const user = await response.json();
      console.log("✅ User auto-registered:", user.name);
    }
  } catch (error) {
    console.log("ℹ️ Background user registration skipped:", error.message);
  }
};

// ✅ Helper function to get current user from storage
const getCurrentUserFromStorage = () => {
  try {
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error("Error retrieving current user:", error);
    return null;
  }
};
