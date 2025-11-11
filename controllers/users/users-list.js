const USER = require("../../models/auth/user");

exports.userList = async (req, res) => {
  try {
    let { q, page = 1, limit = 20, isVerifed, hasChild, isActive } = req.query;

    const filter = {
      isDeleted: false,
    };

    if (q) {
      filter.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    if (isVerifed === "true" || isVerifed === "false") {
      filter.isVerifed = isVerifed === "true";
    }

    if (hasChild === "true" || hasChild === "false") {
      filter.hasChild = hasChild === "true";
    }

    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await USER.find(filter)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await USER.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total: totalUsers,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalUsers / limit),
      data: users,
    });
  } catch (error) {
    console.log("Error listing users:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
