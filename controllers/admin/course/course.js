const Course = require("../../../models/course/course");
const { v4: uuidv4 } = require("uuid");

exports.createCourse = async (req, res) => {
  try {
    const user = req.user;
    const role = user.role;

    const creatorId = user._id;

    let staffId = null;
    let branchId = null;

    if (role === "staff") {
      staffId = creatorId;
      branchId = req.body.branchId || user.branchId;
    } else if (role === "entityadmin") {
      staffId = null;
      branchId = req.body.branchId;
    }

    const thumbnailBase64 = req.files?.thumbnail
      ? `data:${
          req.files.thumbnail[0].mimetype
        };base64,${req.files.thumbnail[0].buffer.toString("base64")}`
      : null;

    const coverImageBase64 = req.files?.coverImage
      ? `data:${
          req.files.coverImage[0].mimetype
        };base64,${req.files.coverImage[0].buffer.toString("base64")}`
      : null;

    const parseArrayField = (field) => {
      if (!req.body[field]) return [];
      return typeof req.body[field] === "string"
        ? [req.body[field]]
        : req.body[field];
    };

    const tags = parseArrayField("tags");
    const language = parseArrayField("language");

    const contactInfo = req.body.contactInfo || {};
    contactInfo.userId = creatorId;
    const courseContent = req.body.courseContent || {};
    courseContent.courseId = null;

    const course = await Course.create({
      courseId: `COURSE-${uuidv4()}`,

      title: req.body.title,
      subtitle: req.body.subtitle,
      description: req.body.description,

      category: req.body.category,
      subCategory: req.body.subCategory,
      courseType: req.body.courseType,
      level: req.body.level,
      basePrice: req.body.basePrice,

      branchId,
      staffId,
      createdBy: creatorId,

      language,
      tags,

      thumbnail: thumbnailBase64,
      coverImage: coverImageBase64,

      isPaid: req.body.isPaid,
      status: req.body.status,

      contactInfo,
      courseContent,

      audit: {
        createdBy: creatorId,
        updatedBy: null,
        deletedBy: null,
        isActive: true,
        isDeleted: false,
        isVerified: false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    console.log("Create Course Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
