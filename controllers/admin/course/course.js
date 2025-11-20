const Course = require("../../../models/course/course");
const Branch = require("../../../models/branch/branch");
const USER = require("../../../models/auth/user");
const { v4: uuidv4 } = require("uuid");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../../utils/responseHandler");

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
      return responseHandler(
        res,
        STATUS.BAD,
        "title, description, basePrice, and courseType are required",
      );
    }

    const role = req.user.role;
    const userId = req.user.id;

    if (!["entityAdmin", "BranchAdmin", "StaffAdmin"].includes(role)) {
      return responseHandler(
        res,
        STATUS.UNAUTHORIZED,
        "You do not have permission to create a course",
      );
    }

    if (!branchId) {
      return responseHandler(
        res,
        STATUS.BAD,
        "branchId is required to create a course",
      );
    }

    const branchDoc = await Branch.findOne({
      branchId: branchId,
      "audit.isDeleted": false,
    });

    if (!branchDoc) {
      return responseHandler(res, STATUS.NOT_FOUND, "Branch not found");
    }

    if (role === "BranchAdmin") {
      if (branchDoc.user.toString() !== userId) {
        return responseHandler(
          res,
          STATUS.UNAUTHORIZED,
          "You are not authorized to create courses in this branch",
        );
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
        return responseHandler(
          res,
          STATUS.UNAUTHORIZED,
          "Staff is not allowed to create courses in this branch",
        );
      }
    }

    let contentArr = [];
    if (courseContent) {
      try {
        contentArr = JSON.parse(courseContent);
      } catch (err) {
        return responseHandler(
          res,
          STATUS.BAD,
          "Invalid JSON format for courseContent",
        );
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

    return responseHandler(
      res,
      STATUS.CREATED,
      "Course created successfully",
      newCourse,
    );
  } catch (error) {
    console.log("Create Course Error:", error);
    return errorResponse(res, error);
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const course = await Course.findOne({ courseId });

    if (!course || course.audit.isDeleted) {
      return responseHandler(res, STATUS.NOT_FOUND, "Course not found");
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
      return responseHandler(
        res,
        STATUS.UNAUTHORIZED,
        "Not authorized to update this course",
      );
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
            return responseHandler(
              res,
              STATUS.BAD,
              "Invalid JSON format for courseContent",
            );
          }
        } else {
          course[key] = req.body[key];
        }
      }
    });

    course.audit.updatedBy = userId;
    await course.save();

    return responseHandler(
      res,
      STATUS.OK,
      "Course updated successfully",
      course,
    );
  } catch (error) {
    console.log("Update Course Error:", error);
    return errorResponse(res, error);
  }
};
