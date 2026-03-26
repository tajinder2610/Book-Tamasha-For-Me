export const handleAuthSuccess = (data, navigate) => {
  if (!data) {
    navigate("/login");
    return;
  }

  const token = data.token;
  const role = data.role;
  const partnerRequestStatus = data.partnerRequestStatus;
  const nextPath = data.next;

  if (token) {
    localStorage.setItem("token", token);
  }

  if (
    role === "user" &&
    ["pending", "rejected", "blocked"].includes(partnerRequestStatus)
  ) {
    localStorage.removeItem("token");
    navigate("/partner-approval-pending");
    return;
  }

  if (nextPath) {
    if (nextPath === "/blocked-user-access-denied") {
      localStorage.removeItem("token");
    }
    navigate(nextPath);
    return;
  }

  if (role === "admin") {
    navigate("/admin");
    return;
  }

  if (role === "partner") {
    navigate("/partner");
    return;
  }

  navigate("/");
};
