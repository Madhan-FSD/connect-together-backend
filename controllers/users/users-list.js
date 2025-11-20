const USER = require("../../models/auth/user");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../utils/responseHandler");

exports.userList = async (req, res) => {
  try {
    let { q, page = 1, limit = 20, isVerifed, hasChild, isActive } = req.query;

    const filter = {};

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

    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }

    if (hasChild === "true") {
      filter["children.0"] = { $exists: true };
    } else if (hasChild === "false") {
      filter["children.0"] = { $exists: false };
    }

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const users = await USER.find(filter)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await USER.countDocuments(filter);

    return responseHandler(res, STATUS.OK, "Users fetched successfully", {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    console.log("Error listing users:", error);
    return errorResponse(res, error);
  }
};
