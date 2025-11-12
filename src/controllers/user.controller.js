import mongoose from "mongoose";
import { User, Child } from "../models/user.model.js";
import ActivityLog from "../models/activitylog.model.js";
import { getComprehensiveDashboardData } from "../utils/dataFetcher.js";
import { permissionKeys } from "../utils/permissionKeys.js";
import { calculateAge } from "../utils/child.utils.js";
import {
  getChildDashboardData,
  getNormalUserDashboardData,
} from "../utils/dashboardHelpers.js";

/**
 * GET /api/users/dashboard
 * Fetch dashboard data based on role (Parent / Normal)
 */
export const getDashboard = async (req, res) => {
  try {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID format." });
    }

    let user;

    user = await User.findById(userId, { role: 1 }).lean();

    if (!user) {
      const parentWithChild = await User.findOne(
        { "children._id": userId },
        { "children.$": 1 }
      ).lean();

      if (parentWithChild && parentWithChild.children?.length) {
        user = {
          _id: userId,
          role: "CHILD",
        };
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const role = (user.role || "NORMAL_USER").toUpperCase();
    let dashboardData;

    if (role === "PARENT") {
      dashboardData = await getComprehensiveDashboardData(userId);
      if (!dashboardData)
        return res
          .status(404)
          .json({ message: "Parent dashboard data not found." });
      return res.status(200).json(dashboardData);
    }

    if (role === "NORMAL_USER") {
      dashboardData = await getNormalUserDashboardData(userId);
      if (!dashboardData)
        return res
          .status(404)
          .json({ message: "Normal User data could not be retrieved." });
      return res.status(200).json(dashboardData);
    }

    if (role === "CHILD") {
      dashboardData = await getChildDashboardData(userId);
      if (!dashboardData)
        return res
          .status(404)
          .json({ message: "Child User data could not be retrieved." });
      return res.status(200).json(dashboardData);
    }

    return res.status(200).json({
      message: `Dashboard logic is not yet defined for the ${role} role.`,
      role,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ message: "Failed to retrieve dashboard data." });
  }
};

export const updateChildPermission = async (req, res) => {
  try {
    if (req.role === "CHILD")
      return res
        .status(403)
        .json({ message: "Only parents can update permissions." });

    const parentId = req.userId;
    const { childId } = req.params;

    const updates = req.body;

    if (
      !updates ||
      typeof updates !== "object" ||
      Object.keys(updates).length === 0
    ) {
      return res.status(400).json({
        message: "No permission updates provided in the request body.",
      });
    }

    const allowedKeys = permissionKeys;
    const updateSet = {};
    const updatedKeys = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key) || typeof value !== "boolean") {
        return res.status(400).json({
          message: `Invalid permission key '${key}' or value provided. All permission values must be boolean.`,
        });
      }

      const permissionPath = `children.$[child].permissions.${key}`;
      updateSet[permissionPath] = value;
      updatedKeys.push(key);
    }

    const result = await User.updateOne(
      {
        _id: parentId,
        "children._id": new mongoose.Types.ObjectId(childId),
      },

      { $set: updateSet },
      {
        arrayFilters: [{ "child._id": new mongoose.Types.ObjectId(childId) }],
      }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ message: "Parent or Child not found." });

    res.status(200).json({
      message: `Successfully updated ${updatedKeys.length} permission(s) for child ${childId}.`,
      updatedKeys: updatedKeys,
    });
  } catch (error) {
    console.error("Error updating child permission:", error);
    res.status(500).json({ message: "Failed to update permissions." });
  }
};

/**
 * POST /api/users/child
 * Add a child profile (parent only)
 */
export const addChild = async (req, res) => {
  try {
    if (req.role === "CHILD") {
      return res.status(403).json({ error: "Only parents can add children." });
    }

    const parentId = req.userId;
    const { firstName, lastName, dob, gender, accessCode } = req.body;

    if (!firstName || !lastName || !dob || !accessCode) {
      return res.status(400).json({
        error:
          "First Name, Last Name, Date of Birth (dob), and access code are required.",
      });
    }

    const parent = await User.findById(parentId);
    if (!parent) {
      return res.status(404).json({ error: "Parent not found." });
    }

    const newChild = {
      firstName,
      lastName,
      dob: new Date(dob),
      gender,
      accessCode,
    };

    parent.children.push(newChild);

    let newToken = null;
    let roleJustUpgraded = false;

    if (parent.role === "NORMAL_USER") {
      parent.role = "PARENT";
      roleJustUpgraded = true;
    }

    await parent.save();
    const savedChild = parent.children[parent.children.length - 1];

    if (roleJustUpgraded) {
      newToken = jwt.sign(
        { id: parent._id, role: parent.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
    }

    const responsePayload = {
      message: roleJustUpgraded
        ? "Child successfully added and role updated to PARENT."
        : "Child successfully added.",
      child: {
        id: savedChild._id,
        firstName: savedChild.firstName,
        lastName: savedChild.lastName,
        gender: savedChild.gender,
        dob: savedChild.dob,
        age: calculateAge(savedChild.dob),
        permissions: savedChild.permissions,
      },
    };

    if (newToken) responsePayload.token = newToken;

    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error("Error adding child:", error);
    return res
      .status(500)
      .json({ error: "Server error during child creation." });
  }
};

/**
 * GET /api/users/child/:childId
 * Get specific child profile + last 30 days of activity (parent only)
 */
export const getChildDetails = async (req, res) => {
  try {
    if (req.role !== "PARENT")
      return res
        .status(403)
        .json({ error: "Only parents can view child details." });

    const parentId = req.userId;
    const { childId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(parentId) ||
      !mongoose.Types.ObjectId.isValid(childId)
    ) {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const parentObjectId = new mongoose.Types.ObjectId(parentId);
    const childObjectId = new mongoose.Types.ObjectId(childId);

    const user = await User.findOne(
      {
        _id: parentObjectId,
        "children._id": childObjectId,
      },
      {
        children: { $elemMatch: { _id: childObjectId } },
      }
    ).lean();

    if (!user || !Array.isArray(user.children) || user.children.length === 0) {
      return res.status(404).json({ message: "Parent or Child not found." });
    }

    const child = user.children[0];

    if (!child._id || child._id.toString() !== childObjectId.toString()) {
      return res.status(404).json({ message: "Child not found." });
    }

    if (child.accessCodeHash) delete child.accessCodeHash;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activityLog = await ActivityLog.find({
      parentId: parentObjectId,
      childId: childObjectId,
      timestamp: { $gte: thirtyDaysAgo },
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      childProfile: {
        id: child._id.toString(),
        firstName: child.firstName || null,
        lastName: child.lastName || null,
        gender: child.gender || null,
        dob: child.dob || null,
        age: child.dob ? calculateAge(child.dob) : null,
        addresses: child.addresses || [],
        permissions: child.permissions || {},
      },
      activityLog,
    });
  } catch (error) {
    console.error("Error fetching child details:", error);
    return res.status(500).json({ message: "Failed to fetch child details." });
  }
};
