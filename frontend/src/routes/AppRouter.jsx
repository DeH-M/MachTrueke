// src/routes/AppRouter.jsx
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";
import ProtectedRoute from "./ProtectedRoute";

import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Home from "../pages/Home";
import Likes from "../pages/Likes";

// Perfil
import Profile from "../pages/profile/Profile";
import ProfileProducts from "../pages/profile/ProfileProducts";
import ProfileSettings from "../pages/profile/ProfileSettings";

export const router = createBrowserRouter([
  // Páginas públicas (auth)
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
    ],
  },

  // Páginas protegidas (requieren sesión)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/likes", element: <Likes /> },

          // Perfil y subrutas
          {
            path: "/profile",
            element: <Profile />,
            children: [
              { index: true, element: <ProfileProducts /> },      // /profile
              { path: "products", element: <ProfileProducts /> }, // /profile/products
              { path: "settings", element: <ProfileSettings /> }, // /profile/settings
            ],
          },
        ],
      },
    ],
  },

  // 404 (opcional)
  { path: "*", element: <div style={{ padding: 24 }}>404: Página no encontrada</div> },
]);
