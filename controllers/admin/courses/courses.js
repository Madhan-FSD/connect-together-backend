const Course = require("../../../models/course/course");

exports.createCourse = async (req, res) => {
  try {
    const body = req.body;
    const course = await Course.create({
      ...body,
      createdById: req.user.id,
    });
    return res.status(201).json({ success: true, course });
  } catch (err) {
    console.error("Create course error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
