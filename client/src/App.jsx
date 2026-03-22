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
import PartnerRequestSent from "./pages/PartnerRequestSent";
import PartnerApprovalPending from "./pages/PartnerApprovalPending";
import BlockedUserAccessDenied from "./pages/BlockedUserAccessDenied";

import NotFound from "./Components/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ALL REGISTERED USERS */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["user"]}>  {/* allowedRoles is a prop */}
              <Home />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>  {/* allowedRoles is a prop */}
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* PARTNER */}
        <Route
          path="/partner"
          element={
            <ProtectedRoute allowedRoles={["partner"]}>  {/* allowedRoles is a prop */}
              <Partner />
            </ProtectedRoute>
          }
        />

        {/* USER PROFILE */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["user"]}>  {/* allowedRoles is a prop */}
              <User />
            </ProtectedRoute>
          }
        />

        {/* USER ONLY */}
        <Route
          path="/movie/:id"
          element={
            <ProtectedRoute allowedRoles={["user"]}>  {/* allowedRoles is a prop */}
              <SingleMovie />
            </ProtectedRoute>
          }
        />

        {/* USER ONLY */}
        <Route
          path="/book-show/:id"
          element={
            <ProtectedRoute allowedRoles={["user"]}>  {/* allowedRoles is a prop */}
              <BookShow />
            </ProtectedRoute>
          }
        />

        {/* USER ONLY */}
        <Route
          path="/payment-success"
          element={
            <ProtectedRoute allowedRoles={["user"]}>  {/* allowedRoles is a prop */}
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/partner-request-sent" element={<PartnerRequestSent />} />
        <Route path="/partner-approval-pending" element={<PartnerApprovalPending />} />
        <Route path="/blocked-user-access-denied" element={<BlockedUserAccessDenied />} />
        <Route path="/forget" element={<Forget />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/reset/:email" element={<Reset />} />
        {/* 404 PAGE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
