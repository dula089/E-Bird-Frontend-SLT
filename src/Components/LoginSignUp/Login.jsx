import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";
import { loginWithEmployeeNumber } from "../../utils/erpApi";
import "./Login.css";
import SLT from "../../Assets/E-Bird1.png";

const Login = ({ onLogin }) => {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState("en");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedLang = localStorage.getItem("language") || "en";
    setLanguage(savedLang);
    i18n.changeLanguage(savedLang);
  }, [i18n]);

  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    localStorage.setItem("language", selectedLang);
    i18n.changeLanguage(selectedLang);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!employeeNumber.trim()) {
      Swal.fire({
        icon: "warning",
        title: t("employeeNumberRequired"),
        text: t("pleaseEnterEmployeeNumber"),
        confirmButtonColor: "#0078d7",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await loginWithEmployeeNumber(employeeNumber);

      if (
        response &&
        response.success &&
        response.data &&
        response.data.length > 0
      ) {
        const employee = response.data[0];

        const userData = {
          name: employee.employeeName,
          username: employee.employeeNumber,
          email: `${employee.employeeNumber}@slt.com.lk`,
          profile: "erp_employee",
          employeeNumber: employee.employeeNumber,
          title: employee.employeeTitle,
          initials: employee.employeeInitials,
          surname: employee.employeeSurname,
          designation: employee.designation,
          gradeName: employee.gradeName,
          supervisorNumber: employee.employeeSupervisorNumber || null,
          hierarchy: response.data,
          loginTime: new Date().toISOString(),
        };

        await Swal.fire({
          icon: "success",
          title: t("loginSuccessful"),
          html: `
            <div style="text-align: left;">
              <p><strong>${t("welcome")}, ${userData.name}!</strong></p>
              <p>${t("designation")}: ${userData.designation}</p>
              <p>${t("grade")}: ${userData.gradeName}</p>
            </div>
          `,
          timer: 2000,
          showConfirmButton: false,
          timerProgressBar: true,
        });

        if (onLogin) onLogin(userData);
        navigate("/dashboard");
      } else {
        throw new Error("Employee not found or invalid response");
      }
    } catch (error) {
      console.error("Login error:", error);
      Swal.fire({
        icon: "error",
        title: t("loginFailed"),
        text: error.message || t("invalidEmployeeNumber"),
        confirmButtonColor: "#d33",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-background">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      {/* Login Card */}
      <div className="login-card">
        {/* Language Selector */}
        <div className="language-selector">
          <svg
            className="language-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <select
            value={language}
            onChange={handleLanguageChange}
            className="language-dropdown"
          >
            <option value="en">English</option>
            <option value="si">සිංහල</option>
            <option value="ta">தமிழ்</option>
          </select>
        </div>

        {/* Logo/Icon */}
        <div className="login-logo">
          <img src={SLT} alt="Telecom" className="SLT-Telecome" />
        </div>

        <p className="login-subtitle">{t("enterEmployeeNumberToContinue")}</p>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label className="input-label">{t("employeeNumber")}</label>
            <div className="input-wrapper">
              <svg
                className="input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder={t("employeeNumberPlaceholder")}
                className="input-field"
                disabled={loading}
                maxLength={6}
                autoFocus
              />
            </div>
            <small className="input-hint">
              {t("enterSixDigitEmployeeNumber")}
            </small>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <div className="button-loader">
                <div className="spinner"></div>
                <span>{t("signingIn")}</span>
              </div>
            ) : (
              <>
                <span>{t("login")}</span>
                <svg
                  className="button-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="loader-overlay">
          <div className="modern-loader">
            <div className="loader-ring"></div>
            <div className="loader-ring"></div>
            <div className="loader-ring"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
