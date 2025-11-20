const BRANCH = require("../../../models/branch/branch");
const USER = require("../../../models/auth/user");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../../utils/responseHandler");

exports.createStaff = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, branchId } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !branchId) {
      return responseHandler(
        res,
        STATUS.BAD,
        "firstName, lastName, email, phone, password, and branchId are required",
      );
    }

    const branch = await BRANCH.findOne({ branchId });

    if (!branch || branch.audit.isDeleted) {
      return responseHandler(res, STATUS.NOT_FOUND, "Branch not found");
    }

    const emailExists = await USER.findOne({ email });
    const phoneExists = await USER.findOne({ phone });

    if (emailExists) {
      return responseHandler(res, STATUS.BAD, "Email already exists");
    }

    if (phoneExists) {
      return responseHandler(res, STATUS.BAD, "Phone number already exists");
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

    return responseHandler(
      res,
      STATUS.CREATED,
      "Staff created successfully",
      staff,
    );
  } catch (error) {
    return errorResponse(res, error);
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
      return responseHandler(res, STATUS.NOT_FOUND, "Staff not found");
    }

    return responseHandler(
      res,
      STATUS.OK,
      "Staff profile fetched successfully",
      staff,
    );
  } catch (error) {
    console.log("Get Staff Profile Error:", error);
    return errorResponse(res, error);
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await USER.findById(id);

    if (!staff || staff.audit.isDeleted) {
      return responseHandler(res, STATUS.NOT_FOUND, "Staff not found");
    }

    const isEntityAdmin = req.user.role === "entityAdmin";

    const isBranchAdmin = await BRANCH.findOne({
      branchId: staff.branchId,
      user: req.user.id,
    });

    const isSelf =
      req.user.role === "StaffAdmin" && req.user.id === staff._id.toString();

    if (!isEntityAdmin && !isBranchAdmin && !isSelf) {
      return responseHandler(
        res,
        STATUS.UNAUTHORIZED,
        "Not authorized to update staff",
      );
    }

    if (req.body.email && req.body.email !== staff.email) {
      const emailExists = await USER.findOne({
        email: req.body.email,
        _id: { $ne: staff._id },
      });

      if (emailExists) {
        return responseHandler(res, STATUS.BAD, "Email already in use");
      }
    }

    if (req.body.phone && req.body.phone !== staff.phone) {
      const phoneExists = await USER.findOne({
        phone: req.body.phone,
        _id: { $ne: staff._id },
      });

      if (phoneExists) {
        return responseHandler(res, STATUS.BAD, "Phone number already in use");
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

    return responseHandler(res, STATUS.OK, "Staff updated successfully", staff);
  } catch (error) {
    console.log("Update Staff Error:", error);
    return errorResponse(res, error);
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await USER.findById(id);

    if (!staff || staff.audit.isDeleted) {
      return responseHandler(res, STATUS.NOT_FOUND, "Staff not found");
    }

    const isEntityAdmin = req.user.role === "entityAdmin";

    const isBranchAdmin = await BRANCH.findOne({
      branchId: staff.branchId,
      user: req.user.id,
      "audit.isDeleted": false,
      "audit.isActive": true,
    });

    if (!isEntityAdmin && !isBranchAdmin) {
      return responseHandler(
        res,
        STATUS.UNAUTHORIZED,
        "Not authorized to delete staff",
      );
    }

    staff.audit.isDeleted = true;
    staff.audit.deletedBy = req.user.id;
    await staff.save();

    return responseHandler(res, STATUS.OK, "Staff deleted successfully");
  } catch (error) {
    console.log("Delete Staff Error:", error);
    return errorResponse(res, error);
  }
};
