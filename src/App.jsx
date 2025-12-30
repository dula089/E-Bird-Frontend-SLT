import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./config/azureConfig";

import Dashboard from "./Components/Dashboard/Dashboard";
import AddNewRequest from "./Components/AddNewRequest";
import MyRequest from "./Components/MyRequest";
import ViewRequest from "./Components/ViewRequest";
import SideBar from "./Components/Dashboard/SideBar";
import TopBar from "./Components/Dashboard/TopBar";
import MyAssignment from "./Components/MyAssignment";
import Summary from "./Components/Summary";
import { authService } from "./services/authService";
import LoginSignUp from "./Components/LoginSignUp/Login";
import {
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
} from "./utils/userUtils";

import "./App.css";
import "./i18n";
import i18n from "i18next";

function Layout({ user, onLogout }) {
  return (
    <div className="app-container">
      <SideBar currentUser={user} onLogout={onLogout} />
      <div className="main-content">
        <TopBar currentUser={user} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await msalInstance.initialize();

        const savedLang = localStorage.getItem("language") || "en";
        i18n.changeLanguage(savedLang);

        const storedUser = getCurrentUser();

        if (storedUser) {
          console.log("🔄 Restoring user session:", storedUser.name);
          setUser(storedUser);
        } else if (authService.isAuthenticated()) {
          // Azure AD user
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            const userData = {
              name: currentUser.name || "User",
              username: currentUser.username || currentUser.preferred_username,
              email: currentUser.username || currentUser.preferred_username,
              profile: "azure_ad",
            };
            setUser(userData);
            setCurrentUser(userData);
            console.log("✅ Azure AD user authenticated:", userData.name);
          }
        }
      } catch (error) {
        console.error("❌ Error initializing authentication:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = (userData) => {
    console.log("🔐 handleLogin called with:", userData);

    clearCurrentUser();

    setCurrentUser(userData);

    setUser(userData);

    console.log("✅ User logged in successfully:", userData.name);
    console.log("📦 User data stored:", {
      name: userData.name,
      employeeNumber: userData.employeeNumber,
      profile: userData.profile,
      email: userData.email,
    });
  };

  const handleLogout = async () => {
    console.log("👋 Logging out user:", user?.name);

    try {
      // Logout from Azure AD if applicable
      if (user?.profile === "azure_ad") {
        await authService.logout();
      }

      clearCurrentUser();

      // Clear state
      setUser(null);

      // Clear any other session data
      localStorage.removeItem("accessToken");

      console.log("✅ User logged out successfully");
    } catch (error) {
      console.error("❌ Logout error:", error);

      // Force cleanup even if logout fails
      clearCurrentUser();
      setUser(null);
      localStorage.removeItem("accessToken");
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginSignUp onLogin={handleLogin} />
              )
            }
          />
          <Route
            element={
              user ? (
                <Layout user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          >
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/AddNewRequest" element={<AddNewRequest />} />
            <Route path="/MyRequests" element={<MyRequest />} />
            <Route path="/ViewRequests" element={<ViewRequest />} />
            <Route path="/MyAssignments" element={<MyAssignment />} />
            <Route path="/Summary" element={<Summary />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </MsalProvider>
  );
}

export default App;
