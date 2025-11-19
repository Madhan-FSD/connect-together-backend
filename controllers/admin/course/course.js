const Course = require("../../../models/course/course");
const Branch = require("../../../models/branch/branch");
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
      courseContent,
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
        message: "Only admins can create courses",
      });
    }

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    const branchDoc = await Branch.findOne({
      branchId: branchId,
      "audit.isDeleted": false,
    });

    if (!branchDoc) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    if (role === "BranchAdmin") {
      if (branchDoc.user.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "BranchAdmin can only create courses in their own branch",
        });
      }
    }

    if (role === "StaffAdmin") {
      const staff = await USER.findOne({
        _id: userId,
        branchId: branchId,
        isStaff: true,
        "audit.isDeleted": false,
        "audit.isActive": true,
      });

      if (!staff) {
        return res.status(403).json({
          success: false,
          message: "Staff is not allowed to create courses in this branch",
        });
      }
    }

    let contentArr = [];
    if (courseContent) {
      try {
        contentArr = JSON.parse(courseContent);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid courseContent JSON",
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

      branchId: branchDoc._id,
      staffId: role === "StaffAdmin" ? userId : null,

      createdBy: userId,
      createdByRole: role,
      courseContent: contentArr,

      audit: {
        createdBy: userId,
        updatedBy: userId,
        isActive: true,
        isDeleted: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: newCourse,
    });
  } catch (error) {
    console.log("Create Course Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    let filter = {};

    if (role === "entityAdmin") {
      filter = {};
    }

    if (role === "BranchAdmin") {
      const branch = await Branch.findOne({ user: userId });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found for this BranchAdmin",
        });
      }

      filter = { branchId: branch._id };
    }

    if (role === "StaffAdmin") {
      filter = { createdBy: userId };
    }

    filter["audit.isDeleted"] = false;

    const courses = await Course.find(filter)
      .populate("createdBy", "firstName lastName email role")
      .lean();

    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.log("Get Courses Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const course = await Course.findOne({ courseId });

    if (!course || course.audit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let isAllowed = false;

    if (role === "entityAdmin") isAllowed = true;

    if (role === "BranchAdmin") {
      const branch = await Branch.findOne({ user: userId });
      if (branch && branch._id.toString() === course.branchId.toString()) {
        isAllowed = true;
      }
    }

    if (role === "StaffAdmin") {
      if (course.createdBy.toString() === userId) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this course",
      });
    }

    const allowed = [
      "title",
      "description",
      "category",
      "subCategory",
      "courseType",
      "language",
      "level",
      "basePrice",
      "courseContent",
    ];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        if (key === "courseContent") {
          try {
            course.courseContent = JSON.parse(req.body[key]);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: "Invalid JSON for courseContent",
            });
          }
        } else {
          course[key] = req.body[key];
        }
      }
    });

    course.audit.updatedBy = userId;
    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    console.log("Update Course Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const course = await Course.findOne({ courseId });

    if (!course || course.audit.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let isAllowed = false;

    if (role === "entityAdmin") {
      isAllowed = true;
    }

    if (role === "BranchAdmin") {
      const branch = await Branch.findOne({ user: userId });
      if (branch && branch._id.toString() === course.branchId.toString()) {
        isAllowed = true;
      }
    }

    if (role === "StaffAdmin") {
      if (course.createdBy.toString() === userId) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this course",
      });
    }

    course.audit.isDeleted = true;
    course.audit.updatedBy = userId;

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.log("Delete Course Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
