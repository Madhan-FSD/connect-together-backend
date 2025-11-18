const Course = require("../../../models/course/course");
const Branch = require("../../../models/branch/branch");
const Staff = require("../../../models/staff/staff");
const USER = require("../../../models/auth/user");
const { v4: uuidv4 } = require("uuid");

exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      courseType,
      language,
      level,
      basePrice,
      branchId,
    } = req.body;

    if (!title || !description || !basePrice || !courseType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const role = req.user.role;
    const userId = req.user.id;

    if (!["entityAdmin", "BranchAdmin", "StaffAdmin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only Entity Admin, Branch Admin or Staff Admin can create courses",
      });
    }

    let thumbnail = req.files?.thumbnail ? req.files.thumbnail[0].buffer : null;
    let coverImage = req.files?.coverImage
      ? req.files.coverImage[0].buffer
      : null;

    let branchDoc = null;

    if (role === "BranchAdmin" || role === "StaffAdmin") {
      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "branchId required for BranchAdmin or StaffAdmin",
        });
      }

      branchDoc = await Branch.findOne({ branchId });

      if (!branchDoc) {
        return res.status(404).json({
          success: false,
          message: "Branch not found",
        });
      }

      if (branchDoc.audit.isDeleted === true) {
        return res.status(403).json({
          success: false,
          message: "Entity admin will allow you to use this branch",
        });
      }

      if (role === "StaffAdmin") {
        const staff = await Staff.findOne({
          user: userId,
          branchId: branchId,
          "audit.isActive": true,
          "audit.isDeleted": false,
        });
      }
    }

    const creator = await USER.findById(userId).select(
      "firstName lastName email role phone",
    );

    let courseContent = [];

    if (req.body.courseContent) {
      try {
        courseContent = JSON.parse(req.body.courseContent);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid courseContent JSON format",
        });
      }
    }

    const newCourse = await Course.create({
      courseId: uuidv4(),
      title,
      description,
      category,
      subCategory,
      courseType,
      language: typeof language === "string" ? language.split(",") : language,
      level,
      basePrice,
      thumbnail,
      coverImage,
      branchId: branchDoc ? branchDoc._id : null,
      staffId: role === "StaffAdmin" ? userId : null,
      createdBy: userId,
      createdByRole: role,
      courseContent,
      audit: {
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
        isDeleted: false,
        isVerified: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      createdBy: {
        id: userId,
        role: role,
        details: creator,
      },
      data: newCourse,
    });
  } catch (error) {
    console.log("Create Course Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    let filter = {};

    if (role === "entityAdmin") {
      filter = {};
    } else if (role === "BranchAdmin") {
      const branch = await Branch.findOne({ user: userId });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found for this admin",
        });
      }

      filter = { branchId: branch._id };
    } else if (role === "StaffAdmin") {
      filter = { createdBy: userId };
    } else {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view courses",
      });
    }

    const courses = await Course.find(filter)
      .populate("branchId", "branchName branchCode")
      .populate("createdBy", "firstName lastName email role")
      .lean();

    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.log("Get Courses Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
