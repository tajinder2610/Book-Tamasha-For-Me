const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const emailHelper = require("../utils/emailHelper");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const axios = require("axios");

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const getClientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";
const getGoogleCallbackUrl = () =>
  process.env.GOOGLE_CALLBACK_URL || "http://localhost:8082/api/users/google/callback";

const createAppToken = (user) =>
  jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

const getPostLoginPath = ({ role, partnerRequestStatus, isBlocked }) => {
  if (isBlocked) {
    return "/blocked-user-access-denied";
  }

  if (
    role === "user" &&
    ["pending", "rejected", "blocked"].includes(partnerRequestStatus)
  ) {
    return "/partner-approval-pending";
  }

  if (role === "admin") {
    return "/admin";
  }

  if (role === "partner") {
    return "/partner";
  }

  return "/";
};

const redirectToFrontend = (res, path, params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = String(value);
      }
      return acc;
    }, {})
  ).toString();

  const baseUrl = getClientUrl();
  const redirectUrl = `${baseUrl}${path}${query ? `?${query}` : ""}`;
  return res.redirect(redirectUrl);
};

const createOAuthSignupToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10m" });

const buildRandomState = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

const ensureAdmin = async (userId) => {
  const adminUser = await User.findById(userId);
  return adminUser && adminUser.role === "admin" ? adminUser : null;
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.registerUser = async (req, res) => {
  try {
    const { email, password, ...rest } = req.body;
    const requestedPartnerAccess = rest.role === "partner";
    //if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "user already exists",
        success: false,
      });
    }
    //has the password 
    const workFactor = 10; //the higher the number, the more secure but slower the hashing process. 
    const hashedPassword = await bcrypt.hash(req.body?.password, workFactor);
    const newUser = new User({
      ...rest,
      email,
      password: hashedPassword,
      role: "user",
      partnerRequestStatus: requestedPartnerAccess ? "pending" : "none",
      partnerRequestSubmittedAt: requestedPartnerAccess ? new Date() : undefined,
    });
    await newUser.save();

    return res.json({
      message: requestedPartnerAccess
        ? "user created successfully. Partner request sent to admin."
        : "user created successfully",
      success: true,
      data: {
        ...newUser.toObject(),
        requestedPartnerAccess,
      },
    });
  } catch (err) {
    //check for user validation failed error
    console.log(err);
    res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.getPartnerRequests = async (req, res) => {
  try {
    const adminUser = await ensureAdmin(req.userId);

    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Only admins can view partner requests",
      });
    }

    const partnerRequests = await User.find({
      partnerRequestStatus: { $in: ["pending", "approved", "rejected", "blocked"] },
    }).select("-password -otp -otpExpiry");

    return res.json({
      success: true,
      message: "partner requests fetched",
      data: partnerRequests,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.updatePartnerRequestStatus = async (req, res) => {
  try {
    const adminUser = await ensureAdmin(req.userId);

    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Only admins can update partner requests",
      });
    }

    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["approved", "rejected", "blocked"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid partner request status",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.partnerRequestStatus = status;
    user.role = status === "approved" ? "partner" : "user";

    if (!user.partnerRequestSubmittedAt) {
      user.partnerRequestSubmittedAt = new Date();
    }

    await user.save();

    return res.json({
      success: true,
      message: `Partner request ${status} successfully`,
      data: {
        _id: user._id,
        role: user.role,
        partnerRequestStatus: user.partnerRequestStatus,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "user does not exist. Please register",
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
      return res.status(401).json({
        message: "Invalid Credentials",
        success: false,
      });
    }
    if (user.isBlocked) {
      return res.status(403).json({
        message: user.blockReason || "Your account has been blocked for security reasons",
        success: false,
        data: {
          isBlocked: true,
        },
      });
    }
    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. Please continue with Google.",
        success: false,
      });
    }

    const token = createAppToken(user);
    console.log("JWT from login", token);
    res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    return res.json({
      message: "You've successfully logged in!",
      success: true,
      data: {
        token: token,
        role: user.role,
        partnerRequestStatus: user.partnerRequestStatus
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.currentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password -otp -otpExpiry");
    if (user?.isBlocked) {
      return res.status(403).json({
        success: false,
        message: user.blockReason || "Your account has been blocked for security reasons",
      });
    }
    res.json({
      success: true,
      message: "You are authorised to go to the protected route",
      data: user,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.googleAuthStart = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Google OAuth is not configured on the server",
      });
    }

    const state = buildRandomState();
    res.cookie("google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    });

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", getGoogleCallbackUrl());
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    return res.redirect(authUrl.toString());
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.googleAuthCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const storedState = req.cookies?.google_oauth_state;
    res.clearCookie("google_oauth_state");

    if (error) {
      return redirectToFrontend(res, "/login", {
        oauthError: error,
      });
    }

    if (!code || !state || !storedState || state !== storedState) {
      return redirectToFrontend(res, "/login", {
        oauthError: "Invalid OAuth state. Please try again.",
      });
    }

    const tokenResponse = await axios.post(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getGoogleCallbackUrl(),
        grant_type: "authorization_code",
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const googleAccessToken = tokenResponse.data?.access_token;
    if (!googleAccessToken) {
      return redirectToFrontend(res, "/login", {
        oauthError: "Google did not return an access token.",
      });
    }

    const profileResponse = await axios.get(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
    });

    const googleProfile = profileResponse.data;
    const googleId = googleProfile?.id;
    const email = googleProfile?.email?.toLowerCase();
    const name = googleProfile?.name?.trim();

    if (!googleId || !email || !name) {
      return redirectToFrontend(res, "/login", {
        oauthError: "Google profile is incomplete. Please try another account.",
      });
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (!user) {
      const signupToken = createOAuthSignupToken({
        googleId,
        email,
        name,
        avatar: googleProfile?.picture || "",
      });

      return redirectToFrontend(res, "/oauth/select-role", {
        signupToken,
      });
    }

    if (!user.googleId) {
      user.googleId = googleId;
    }
    if (!user.avatar && googleProfile?.picture) {
      user.avatar = googleProfile.picture;
    }
    if (!user.name && name) {
      user.name = name;
    }
    await user.save();

    if (user.isBlocked) {
      return redirectToFrontend(res, "/blocked-user-access-denied");
    }

    const token = createAppToken(user);

    return redirectToFrontend(res, "/oauth/success", {
      token,
      role: user.role,
      partnerRequestStatus: user.partnerRequestStatus,
      next: getPostLoginPath(user),
    });
  } catch (err) {
    console.log("googleAuthCallback error:", err?.response?.data || err.message || err);
    return redirectToFrontend(res, "/login", {
      oauthError: "Google sign-in failed. Please try again.",
    });
  }
};

exports.completeGoogleSignup = async (req, res) => {
  try {
    const { signupToken, role } = req.body;
    const selectedRole = role === "partner" ? "partner" : "user";

    if (!signupToken) {
      return res.status(400).json({
        success: false,
        message: "Signup session expired. Please continue with Google again.",
      });
    }

    const decoded = jwt.verify(signupToken, process.env.JWT_SECRET);
    const email = decoded.email?.toLowerCase();
    const name = decoded.name?.trim();

    if (!decoded.googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google signup data",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ googleId: decoded.googleId }, { email }],
    });

    if (existingUser) {
      if (!existingUser.googleId) {
        existingUser.googleId = decoded.googleId;
        await existingUser.save();
      }

      if (existingUser.isBlocked) {
        return res.json({
          success: true,
          message: "This account is blocked",
          data: {
            role: existingUser.role,
            partnerRequestStatus: existingUser.partnerRequestStatus,
            next: "/blocked-user-access-denied",
          },
        });
      }

      const token = createAppToken(existingUser);
      return res.json({
        success: true,
        message: "Google account linked successfully",
        data: {
          token,
          role: existingUser.role,
          partnerRequestStatus: existingUser.partnerRequestStatus,
          next: getPostLoginPath(existingUser),
        },
      });
    }

    const requestedPartnerAccess = selectedRole === "partner";
    const newUser = new User({
      name,
      email,
      googleId: decoded.googleId,
      avatar: decoded.avatar,
      role: "user",
      partnerRequestStatus: requestedPartnerAccess ? "pending" : "none",
      partnerRequestSubmittedAt: requestedPartnerAccess ? new Date() : undefined,
    });

    await newUser.save();

    if (requestedPartnerAccess) {
      return res.json({
        success: true,
        message: "Google account created. Partner request sent to admin.",
        data: {
          role: newUser.role,
          partnerRequestStatus: newUser.partnerRequestStatus,
          next: "/partner-request-sent",
        },
      });
    }

    const token = createAppToken(newUser);
    return res.json({
      success: true,
      message: "Google sign-in completed successfully",
      data: {
        token,
        role: newUser.role,
        partnerRequestStatus: newUser.partnerRequestStatus,
        next: "/",
      },
    });
  } catch (err) {
    console.log("completeGoogleSignup error:", err?.message || err);
    return res.status(500).json({
      success: false,
      message:
        err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError"
          ? "Signup session expired. Please continue with Google again."
          : err.message,
    });
  }
};

exports.searchUsersForBlocking = async (req, res) => {
  try {
    const adminUser = await ensureAdmin(req.userId);
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Only admins can search users",
      });
    }

    const search = String(req.query.search || "").trim();
    if (!search) {
      return res.json({
        success: true,
        message: "users fetched",
        data: [],
      });
    }

    const regex = new RegExp(escapeRegex(search), "i");
    const users = await User.find({
      role: "user",
      $or: [{ name: regex }, { email: regex }],
      $and: [
        {
          $or: [{ isBlocked: false }, { isBlocked: { $exists: false } }],
        },
      ],
    })
      .select("name email role partnerRequestStatus")
      .limit(10);

    return res.json({
      success: true,
      message: "users fetched",
      data: users,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.getBlockedUsers = async (req, res) => {
  try {
    const adminUser = await ensureAdmin(req.userId);
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Only admins can view blocked users",
      });
    }

    const blockedUsers = await User.find({ isBlocked: true })
      .select("-password -otp -otpExpiry")
      .sort({ blockedAt: -1 });

    return res.json({
      success: true,
      message: "blocked users fetched",
      data: blockedUsers,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const adminUser = await ensureAdmin(req.userId);
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Only admins can block users",
      });
    }

    const { userId, userIds, reason } = req.body;
    const normalizedUserIds = Array.isArray(userIds)
      ? userIds.filter(Boolean)
      : userId
      ? [userId]
      : [];

    if (!normalizedUserIds.length || !String(reason || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "At least one user and a security reason are required",
      });
    }

    const users = await User.find({ _id: { $in: normalizedUserIds } });
    if (users.length !== normalizedUserIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more users were not found",
      });
    }

    const invalidRoleUser = users.find((user) => user.role !== "user");
    if (invalidRoleUser) {
      return res.status(400).json({
        success: false,
        message: "Only users with role user can be blocked",
      });
    }

    const trimmedReason = String(reason).trim();
    const blockedAt = new Date();

    await Promise.all(
      users.map(async (user) => {
        user.isBlocked = true;
        user.blockReason = trimmedReason;
        user.blockedAt = blockedAt;
        await user.save();
      })
    );

    return res.json({
      success: true,
      message: `${users.length} user${users.length > 1 ? "s" : ""} blocked successfully`,
      data: users,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const adminUser = await ensureAdmin(req.userId);
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Only admins can unblock users",
      });
    }

    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBlocked = false;
    user.blockReason = undefined;
    user.blockedAt = undefined;
    if (user.partnerRequestStatus === "blocked") {
      user.partnerRequestStatus = "pending";
    }

    await user.save();

    return res.json({
      success: true,
      message: "User unblocked successfully",
      data: user,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({email});
    if (!user) {
      return res.status(404).json({
        message: "User not registered",
        success: false,
      });
    }

    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    let emailSent = true;
    try {
      await emailHelper("otp.html", user.email, { name: user.name, otp });
    } catch (mailErr) {
      emailSent = false;
      console.log("forgetPassword email send failed:", mailErr?.message || mailErr);
    }

    return res.status(200).json({
      message: emailSent
        ? "Otp sent to registered mail"
        : "OTP generated. Email delivery failed; please check server logs.",
      success: true,
      data: {
        emailSent,
      },
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const {otp, password} = req.body;
    const {email} = req.params;
    //if otp is valid
    const user = await User.findOne({email, otp});
    if (!user) {
      return res.status(404).json({
        message: "Invalid OTP or email",
        success: false,
      });
    }
    //if otp is expired - 10min timer
    if(Date.now()> user.otpExpiry){
      return res.status(401).json({
        message: "otp expired",
        success: false,
      });
    }

    //update new password to db
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save()

    return res.status(200).json({
      message: "password reset successfully",
      success: true,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
      success: false,
    });
  }
};
