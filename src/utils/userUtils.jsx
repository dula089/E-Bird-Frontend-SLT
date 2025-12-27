// utils/userUtils.js  AZURE WITH
// export const getCurrentUser = () => {
//   try {
//     // Try to get user from sessionStorage (set during Azure AD login)
//     const userStr = sessionStorage.getItem("user");
//     if (userStr) {
//       const user = JSON.parse(userStr);
//       return {
//         name: user.name || "",
//         username: user.username || user.email || "",
//         email: user.email || user.username || "",
//       };
//     }

//     // Fallback to localStorage if needed
//     const localUserStr = localStorage.getItem("user");
//     if (localUserStr) {
//       const user = JSON.parse(localUserStr);
//       return {
//         name: user.name || "",
//         username: user.username || user.email || "",
//         email: user.email || user.username || "",
//       };
//     }

//     return null;
//   } catch (error) {
//     console.error("Error getting current user:", error);
//     return null;
//   }
// };

// utils/userUtils.js

/**
 * Get the current logged-in user from localStorage
 * @returns {Object|null} User object or null if not found
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    return user;
  } catch (error) {
    console.error("Error retrieving current user:", error);
    return null;
  }
};

/**
 * Set the current user in localStorage
 * @param {Object} user - User object to store
 */
export const setCurrentUser = (user) => {
  try {
    localStorage.setItem("currentUser", JSON.stringify(user));
  } catch (error) {
    console.error("Error storing current user:", error);
  }
};

/**
 * Clear the current user from localStorage (logout)
 */
export const clearCurrentUser = () => {
  try {
    localStorage.removeItem("currentUser");
  } catch (error) {
    console.error("Error clearing current user:", error);
  }
};

/**
 * Check if a user is currently logged in
 * @returns {boolean}
 */
export const isUserLoggedIn = () => {
  return getCurrentUser() !== null;
};

/**
 * Get user's display name
 * @returns {string}
 */
export const getUserDisplayName = () => {
  const user = getCurrentUser();
  return user?.name || user?.username || user?.email || "User";
};

/**
 * Get user's service number
 * @returns {string|null}
 */
export const getUserServiceNumber = () => {
  const user = getCurrentUser();
  return user?.serviceNumber || user?.username || null;
};
