const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const emailHelper = require("../utils/emailHelper");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");

exports.registerUser = async (req, res) => {
  try {
    const { email, password, ...rest } = req.body;
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
    const newUser = new User({ ...rest, email, password: hashedPassword });
    await newUser.save();

    return res.json({
      message: "user created successfully",
      success: true,
      data: newUser,
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
    const token = jwt.sign({ userId: user["_id"], role: user.role  }, process.env.JWT_SECRET, { //userId: user._id
      expiresIn: "1d",
    });
    console.log("JWT from login", token);
    res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    return res.json({
      message: "You've successfully logged in!",
      success: true,
      data: {
        token: token,
        role: user.role
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
