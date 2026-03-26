const router = require("express").Router();
const {
  registerUser,
  loginUser,
  currentUser,
  forgetPassword,
  resetPassword,
  getPartnerRequests,
  updatePartnerRequestStatus,
  searchUsersForBlocking,
  getBlockedUsers,
  blockUser,
  unblockUser,
  googleAuthStart,
  googleAuthCallback,
  completeGoogleSignup,
} = require("../controller/user");
const authMiddleware = require("../middleware/auth");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/google/login", googleAuthStart);
router.get("/google/callback", googleAuthCallback);
router.post("/oauth/complete", completeGoogleSignup);
router.get("/get-current-user", authMiddleware, currentUser);
router.get("/partner-requests", authMiddleware, getPartnerRequests);
router.patch("/partner-requests/:id", authMiddleware, updatePartnerRequestStatus);
router.get("/search", authMiddleware, searchUsersForBlocking);
router.get("/blocked-users", authMiddleware, getBlockedUsers);
router.post("/block", authMiddleware, blockUser);
router.patch("/blocked-users/:id/unblock", authMiddleware, unblockUser);
router.patch("/forgetpassword", forgetPassword);
router.patch("/resetpassword/:email", resetPassword);

module.exports = router;
