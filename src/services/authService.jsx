import { msalInstance, loginRequest } from "../config/azureConfig";

export const authService = {
  async login() {
    try {
      const loginResponse = await msalInstance.loginPopup(loginRequest);
      return loginResponse;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  async loginRedirect() {
    try {
      await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Login redirect failed:", error);
      throw error;
    }
  },

  async logout() {
    try {
      await msalInstance.logoutPopup({
        mainWindowRedirectUri: "/",
      });
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  },

  async getAccessToken() {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      throw new Error("No accounts found");
    }

    const request = {
      ...loginRequest,
      account: accounts[0],
    };

    try {
      const response = await msalInstance.acquireTokenSilent(request);
      return response.accessToken;
    } catch (error) {
      console.error("Silent token acquisition failed:", error);
      const response = await msalInstance.acquireTokenPopup(request);
      return response.accessToken;
    }
  },

  getCurrentUser() {
    const accounts = msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  },

  isAuthenticated() {
    const accounts = msalInstance.getAllAccounts();
    return accounts.length > 0;
  },
};
