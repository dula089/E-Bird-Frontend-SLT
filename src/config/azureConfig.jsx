// import { PublicClientApplication } from "@azure/msal-browser";

// export const msalConfig = {
//   auth: {
//     clientId: "7d38e492-68fe-4453-ae4d-ed9867c7e1cc", // Replace with your Application (client) ID
//     authority:
//       "https://login.microsoftonline.com/9a5b5691-a451-49e7-93de-9c61cb04328b", // Replace with your Directory (tenant) ID
//     redirectUri: "http://localhost:5173",
//   },
//   cache: {
//     cacheLocation: "sessionStorage",
//     storeAuthStateInCookie: false,
//   },
// };

// export const loginRequest = {
//   scopes: ["User.Read", "openid", "profile", "email"],
// };

// export const graphConfig = {
//   graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
// };

// export const msalInstance = new PublicClientApplication(msalConfig);

import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "7d38e492-68fe-4453-ae4d-ed9867c7e1cc",
    authority:
      "https://login.microsoftonline.com/9a5b5691-a451-49e7-93de-9c61cb04328b",
    redirectUri: "http://localhost:5173",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// ⬇️ FIX: Replace with your actual client ID
export const loginRequest = {
  scopes: [
    "api://7d38e492-68fe-4453-ae4d-ed9867c7e1cc/access_as_user", // ⬅️ Use your actual client ID
    "openid",
    "profile",
    "email",
  ],
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

export const msalInstance = new PublicClientApplication(msalConfig);

// import { PublicClientApplication } from "@azure/msal-browser";

// export const msalConfig = {
//   auth: {
//     clientId: "7d38e492-68fe-4453-ae4d-ed9867c7e1cc", // Your Application (client) ID
//     authority:
//       "https://login.microsoftonline.com/9a5b5691-a451-49e7-93de-9c61cb04328b",
//     redirectUri: "http://localhost:5173",
//   },
//   cache: {
//     cacheLocation: "sessionStorage",
//     storeAuthStateInCookie: false,
//   },
// };

// // IMPORTANT: Change this to request tokens for YOUR API, not Microsoft Graph
// export const loginRequest = {
//   scopes: [`api://7d38e492-68fe-4453-ae4d-ed9867c7e1cc/.default`], // Replace YOUR_CLIENT_ID with your actual client ID
//   // Or use the specific scope if you've defined one:
//   // scopes: ["api://YOUR_CLIENT_ID/access_as_user"]
// };

// export const graphConfig = {
//   graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
// };

// export const msalInstance = new PublicClientApplication(msalConfig);
