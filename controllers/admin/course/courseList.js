const Course = require("../../../models/course/course");
const Branch = require("../../../models/branch/branch");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../../utils/responseHandler");

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
        return responseHandler(
          res,
          STATUS.NOT_FOUND,
          "Branch not found for this BranchAdmin",
        );
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

    return responseHandler(res, STATUS.OK, "Courses fetched successfully", {
      courses,
    });
  } catch (error) {
    console.log("Get Courses Error:", error);
    return errorResponse(res, error);
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const course = await Course.findOne({ courseId });

    if (!course || course.audit.isDeleted) {
      return responseHandler(res, STATUS.NOT_FOUND, "Course not found");
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
      return responseHandler(
        res,
        STATUS.UNAUTHORIZED,
        "Not authorized to delete this course",
      );
    }

    course.audit.isDeleted = true;
    course.audit.updatedBy = userId;

    await course.save();

    return responseHandler(res, STATUS.OK, "Course deleted successfully");
  } catch (error) {
    console.log("Delete Course Error:", error);
    return errorResponse(res, error);
  }
};
