const BRANCH = require("../../../models/branch/branch");
const COMPANY = require("../../../models/companyInformation/company-information");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../../utils/responseHandler");

exports.getAllBranches = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      isActive,
      isDeleted,
      isVerified,
      startDate,
      endDate,
      entityId,
      userId,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let filter = {};

    if (entityId) filter.entityId = entityId;

    if (userId) filter.user = userId;

    if (isActive !== undefined) filter["audit.isActive"] = isActive === "true";
    if (isDeleted !== undefined)
      filter["audit.isDeleted"] = isDeleted === "true";
    if (isVerified !== undefined)
      filter["audit.isVerified"] = isVerified === "true";

    if (search) {
      filter["contactInfo.email"] = { $regex: search, $options: "i" };
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const branches = await BRANCH.find(filter)
      .populate("user", "firstName lastName email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const data = await Promise.all(
      branches.map(async (branch) => {
        const company = await COMPANY.findOne({
          entityId: branch.entityId,
        }).lean();

        return {
          ...branch,
          companyName: company?.companyName || null,
          branchLogo: branch.branchLogo
            ? `data:image/png;base64,${branch.branchLogo.toString("base64")}`
            : null,
        };
      }),
    );

    const total = await BRANCH.countDocuments(filter);

    return responseHandler(res, STATUS.OK, "Branches fetched successfully", {
      total,
      page,
      pages: Math.ceil(total / limit),
      count: data.length,
      data,
    });
  } catch (error) {
    console.log("Get All Branches Error:", error);
    return errorResponse(res, error);
  }
};

exports.getSingleBranch = async (req, res) => {
  try {
    const branch = await BRANCH.findOne({
      branchId: req.params.branchId,
    }).populate("user", "firstName lastName email");

    if (!branch) {
      return responseHandler(res, STATUS.NOT_FOUND, "Branch not found");
    }

    if (branch.audit?.isDeleted === true) {
      return responseHandler(
        res,
        STATUS.BAD,
        "Your Branch is disabled. Contact entity admin to enable your Branch.",
      );
    }

    const company = await COMPANY.findOne({ entityId: branch.entityId });

    const branchLogoBase64 = branch.branchLogo
      ? `data:image/png;base64,${branch.branchLogo.toString("base64")}`
      : null;

    return responseHandler(res, STATUS.OK, "Branch fetched successfully", {
      ...branch._doc,
      companyName: company?.companyName || null,
      branchLogo: branchLogoBase64,
    });
  } catch (error) {
    console.log("Get Branch Error:", error);
    return errorResponse(res, error);
  }
};

exports.softDeleteBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return responseHandler(res, STATUS.BAD, "branchId parameter is required");
    }

    if (branchId.audit?.isDeleted === true) {
      return responseHandler(
        res,
        STATUS.BAD,
        "Your Branch is disabled. Contact entity admin to enable your Branch.",
      );
    }

    const branch = await BRANCH.findOne({
      branchId,
      user: req.user.id,
    });

    if (!branch) {
      return responseHandler(res, STATUS.NOT_FOUND, "Branch not found");
    }

    return responseHandler(res, STATUS.OK, "Branch deleted successfully");
  } catch (error) {
    console.log("Soft Delete Branch Error:", error);
    return errorResponse(res, error);
  }
};
