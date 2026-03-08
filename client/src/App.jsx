import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import User from "./pages/User";
import Partner from "./pages/Partner";

import ProtectedRoute from "./Components/ProtectedRoute";
import SingleMovie from "./SingleMovie";
import BookShow from "./BookShow";
import PaymentSuccess from "./pages/PaymentSuccess";

import Forget from "./pages/Forget";
import Reset from "./pages/Reset";

import NotFound from "./Components/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ALL REGISTERED USERS */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* PARTNER */}
        <Route
          path="/partner"
          element={
            <ProtectedRoute allowedRoles={["partner"]}>
              <Partner />
            </ProtectedRoute>
          }
        />

        {/* USER PROFILE */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <User />
            </ProtectedRoute>
          }
        />

        {/* USER ONLY */}
        <Route
          path="/movie/:id"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <SingleMovie />
            </ProtectedRoute>
          }
        />

        {/* USER ONLY */}
        <Route
          path="/book-show/:id"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <BookShow />
            </ProtectedRoute>
          }
        />

        {/* USER ONLY */}
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forget" element={<Forget />} />
        <Route path="/reset/:email" element={<Reset />} />
        {/* 404 PAGE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
