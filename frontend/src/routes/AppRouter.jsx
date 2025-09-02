import { createBrowserRouter } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

// Páginas
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Home from "../pages/Home";
import Chat from "../pages/Chat";
import Likes from "../pages/Likes";
import Profile from "../pages/Profile";

export const router = createBrowserRouter([
  // Públicas (auth)
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
    ],
  },
  // Privadas
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/chat", element: <Chat /> },
          { path: "/likes", element: <Likes /> },
          { path: "/profile/:id", element: <Profile /> },
        ],
      },
    ],
  },
]);
