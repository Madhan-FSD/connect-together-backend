const BRANCH = require("../../../models/branch/branch");
const STAFF = require("../../../models/staff/staff");
const { v4: uuidv4 } = require("uuid");

exports.createStaff = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, branchId } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !branchId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const branch = await BRANCH.findOne({
      branchId,
      user: req.user.id,
      "audit.isDeleted": false,
      "audit.isActive": true,
    });

    if (!branch) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive branch",
      });
    }

    const emailExists = await STAFF.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    const staff = await STAFF.create({
      staffId: uuidv4(),
      firstName,
      lastName,
      email,
      phone,
      password,
      branchId,
      user: req.user.id,
      role: { role: "StaffAdmin" },
      audit: {
        createdBy: req.user.id,
        updatedBy: req.user.id,
        isActive: true,
        isDeleted: false,
        isVerified: true,
      },
    });

    const finalResponse = {
      ...staff.toObject(),
      branch: {
        branchId: branch.branchId,
        branchName: branch.branchName,
        branchCode: branch.branchCode,
      },
      user: {
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role,
      },
    };

    return res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: finalResponse,
    });
  } catch (error) {
    console.log("Create Staff Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStaffList = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await BRANCH.findOne({
      branchId,
      user: req.user.id,
    });

    if (!branch) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view staff for this branch",
      });
    }

    if (!branch.role || branch.role.role !== "BranchAdmin") {
      return res.status(403).json({
        success: false,
        message: "This branch does not belong to a Branch Admin",
      });
    }

    const staffList = await STAFF.find({
      branchId,
    }).select("-password");

    return res.status(200).json({
      success: true,
      data: staffList,
    });
  } catch (error) {
    console.log("Get Staff Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getStaffProfile = async (req, res) => {
  try {
    const { staffId } = req.params;

    if (
      !req.user.audit ||
      req.user.audit.isDeleted ||
      !req.user.audit.isActive
    ) {
      return res.status(403).json({
        success: false,
        message: "Branch Admin or Entity Admin must enable your profile",
      });
    }

    const staff = await STAFF.findOne({ staffId });
    if (!staff || staff.audit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const branch = await BRANCH.findOne({
      branchId: staff.branchId,
      user: req.user.id,
      "audit.isDeleted": false,
      "audit.isActive": true,
    });

    if (!branch) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this staff",
      });
    }

    return res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.log("Get Staff Profile Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await STAFF.findOne({ staffId });
    if (!staff || staff.audit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const isBranchAdmin = await BRANCH.findOne({
      branchId: staff.branchId,
      user: req.user.id,
    });

    const isSelf =
      req.user.role === "StaffAdmin" && req.user.staffId === staffId;

    if (!isBranchAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this staff",
      });
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
    const { staffId } = req.params;

    if (
      !req.user.audit ||
      req.user.audit.isDeleted ||
      !req.user.audit.isActive
    ) {
      return res.status(403).json({
        success: false,
        message: "Branch Admin or Entity Admin must enable your profile",
      });
    }

    const staff = await STAFF.findOne({ staffId });
    if (!staff || staff.audit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const branch = await BRANCH.findOne({
      branchId: staff.branchId,
      user: req.user.id,
      "audit.isDeleted": false,
      "audit.isActive": true,
    });

    if (!branch) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete staff from this branch",
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
