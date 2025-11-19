const BRANCH = require("../../../models/branch/branch");
const USER = require("../../../models/auth/user");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

exports.createStaff = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, branchId } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !branchId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const branch = await BRANCH.findOne({ branchId });

    if (!branch || branch.audit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Invalid branch",
      });
    }

    const emailExists = await USER.findOne({ email });
    const phoneExists = await USER.findOne({ phone });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await USER.create({
      userId: uuidv4(),
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      branchId,
      isStaff: true,
      role: { role: "StaffAdmin" },

      audit: {
        createdBy: req.user.id,
        updatedBy: req.user.id,
        isActive: true,
        isDeleted: false,
        isVerified: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: staff,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyStaffProfile = async (req, res) => {
  try {
    const staffId = req.user.id;

    const staff = await USER.findOne({
      _id: staffId,
      isStaff: true,
      "audit.isDeleted": false,
    }).select("-password");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.log("Get Staff Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await USER.findById(id);

    if (!staff || staff.audit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const isEntityAdmin = req.user.role === "entityAdmin";

    const isBranchAdmin = await BRANCH.findOne({
      branchId: staff.branchId,
      user: req.user.id,
    });

    const isSelf =
      req.user.role === "StaffAdmin" && req.user.id === staff._id.toString();

    if (!isEntityAdmin && !isBranchAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this staff",
      });
    }

    if (req.body.email && req.body.email !== staff.email) {
      const emailExists = await USER.findOne({
        email: req.body.email,
        _id: { $ne: staff._id },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    if (req.body.phone && req.body.phone !== staff.phone) {
      const phoneExists = await USER.findOne({
        phone: req.body.phone,
        _id: { $ne: staff._id },
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone number already in use",
        });
      }
    }

    const allowed = ["firstName", "lastName", "email", "phone"];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        staff[key] = req.body[key];
      }
    });

    staff.audit.updatedBy = req.user.id;
    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      data: staff,
    });
  } catch (error) {
    console.log("Update Staff Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await USER.findById(id);

    if (!staff || staff.audit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const isEntityAdmin = req.user.role === "entityAdmin";

    const isBranchAdmin = await BRANCH.findOne({
      branchId: staff.branchId,
      user: req.user.id,
      "audit.isDeleted": false,
      "audit.isActive": true,
    });

    if (!isEntityAdmin && !isBranchAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete staff",
      });
    }

    staff.audit.isDeleted = true;
    staff.audit.deletedBy = req.user.id;
    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Staff deleted successfully (soft delete)",
    });
  } catch (error) {
    console.log("Delete Staff Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
