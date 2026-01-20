require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const connectDB = require("../config/db");

async function createAdmin() {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@aquaforum.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
    const adminUsername = process.env.ADMIN_USERNAME || "admin";

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { role: "admin" }],
    });

    if (existingAdmin) {
      console.log("Admin account already exists:", existingAdmin.email);
      console.log("Updating existing admin password...");
      existingAdmin.password = await bcrypt.hash(adminPassword, 10);
      existingAdmin.role = "admin";
      existingAdmin.isAdmin = true;
      await existingAdmin.save();
      console.log("Admin password updated successfully!");
    } else {
      console.log("Creating new admin account...");
      const admin = new User({
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        isAdmin: true,
        profile: {
          bio: "System Administrator",
        },
      });
      await admin.save();
      console.log("Admin account created successfully!");
      console.log("Email:", adminEmail);
      console.log("Username:", adminUsername);
      console.log("Password:", adminPassword);
      console.log("\n⚠️  Please change the password after first login!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
}

createAdmin();
