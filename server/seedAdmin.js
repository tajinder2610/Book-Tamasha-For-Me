const User = require("./models/userModel");
const bcrypt = require("bcrypt");

async function seedAdmin() {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) return;

    const hashedPassword = await bcrypt.hash("admin@123", 10);

    await User.create({
      name: "Admin Tajinder",
      email: "admintajinder@gmail.com",
      password: hashedPassword,
      role: "admin",
      isAdmin: true
    });

    console.log("Admin user created");
  } catch (err) {
    console.log("Admin seeding failed:", err);
  }
}

module.exports = seedAdmin;