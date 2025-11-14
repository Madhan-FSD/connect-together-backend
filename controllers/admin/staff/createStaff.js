const USER = require("../../../models/auth/user");
const { v4: uuidv4 } = require("uuid");

exports.createStaff = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, branchId } = req.body;

    if (!firstName || !email || !phone || !password || !branchId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const emailExists = await USER.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const staff = await USER.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      branchId,
      userType: "staff",
      staffId: uuidv4(),

      audit: {
        createdBy: req.user.id,
        updatedBy: req.user.id,
        isActive: true,
        isDeleted: false,
        isVerified: false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: staff,
    });
  } catch (error) {
    console.log("Create Staff Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await USER.findOne({ staffId });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    if (req.user.userType !== "admin") {
      if (req.user.userType === "staff" && req.user.staffId !== staffId) {
        return res.status(403).json({
          success: false,
          message: "You can update only your own profile",
        });
      }

      if (req.user.branchId !== staff.branchId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this staff",
        });
      }

      if (!["staff"].includes(req.user.userType)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized",
        });
      }
    }

    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "isActive",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        staff[field] = req.body[field];
      }
    });

    // Audit update
    staff.audit.updatedBy = req.user.id;

    await staff.save();

    res.json({
      success: true,
      message: "Staff updated successfully",
      data: staff,
    });
  } catch (error) {
    console.log("Update Staff Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await USER.findById(req.params.staffId);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    staff.audit.isDeleted = true;
    staff.audit.deletedBy = req.user.id;

    await staff.save();

    res.json({
      success: true,
      message: "Staff deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
