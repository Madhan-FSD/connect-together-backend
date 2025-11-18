const BRANCH = require("../../../models/branch/branch");
const COMPANY = require("../../../models/companyInformation/company-information");
const { v4: uuidv4 } = require("uuid");

exports.createBranch = async (req, res) => {
  try {
    const {
      branchName,
      branchCode,
      contactInfo,
      entityId,
      branchDays,
      branchTime,
    } = req.body;

    if (!branchName || !branchCode || !contactInfo || !entityId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (holidayData.hoildayTypes === "full_holiday") {
      holidayData.openingTime = null;
      holidayData.closingTime = null;
    }

    if (holidayData.hoildayTypes === "half_holiday") {
      if (!holidayData.openingTime || !holidayData.closingTime) {
        return res.status(400).json({
          success: false,
          message:
            "For half day holiday, openingTime and closingTime are required",
        });
      }
    }

    let parsedContactInfo, parsedBranchDays, parsedBranchTime;

    try {
      parsedContactInfo = JSON.parse(contactInfo);
    } catch {
      return res.status(400).json({
        success: false,
        message: "contactInfo must be valid JSON",
      });
    }

    try {
      parsedBranchDays = branchDays ? JSON.parse(branchDays) : [];
      if (!Array.isArray(parsedBranchDays)) throw new Error();
    } catch {
      return res.status(400).json({
        success: false,
        message: "branchDays must be valid JSON array",
      });
    }

    try {
      parsedBranchTime = branchTime ? JSON.parse(branchTime) : null;
      if (!parsedBranchTime?.open || !parsedBranchTime?.close)
        throw new Error();
    } catch {
      return res.status(400).json({
        success: false,
        message: "branchTime must be valid JSON with open & close keys",
      });
    }

    const company = await COMPANY.findOne({ entityId, user: req.user.id });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Invalid entityId OR this company does not belong to you",
      });
    }

    const isEmailUsed = await BRANCH.findOne({
      "contactInfo.email": parsedContactInfo.email,
      entityId,
    });

    if (isEmailUsed) {
      return res.status(400).json({
        success: false,
        message: "This email already exists in another branch",
      });
    }

    if (parsedContactInfo.phone) {
      const cleaned = String(parsedContactInfo.phone).replace(/[^0-9]/g, "");
      if (cleaned.length < 10 || cleaned.length > 12) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid phone number" });
      }
      parsedContactInfo.phone = Number(cleaned);
    }

    parsedContactInfo.userId = req.user.id;

    const branchLogo = req.file ? req.file.buffer : null;

    const newBranch = await BRANCH.create({
      branchId: uuidv4(),
      user: req.user.id,
      branchName,
      branchCode,
      contactInfo: parsedContactInfo,
      branchLogo,
      branchDays: parsedBranchDays,
      role: { role: "BranchAdmin" },
      branchTime: parsedBranchTime,
      entityId,
      audit: {
        createdBy: req.user.id,
        updatedBy: req.user.id,
        deletedBy: null,
        isActive: true,
        isDeleted: false,
        isVerified: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: newBranch,
    });
  } catch (error) {
    console.log("Create Branch Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

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

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: data.length,
      data,
    });
  } catch (error) {
    console.log("Get All Branches Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getSingleBranch = async (req, res) => {
  try {
    const branch = await BRANCH.findOne({
      branchId: req.params.branchId,
    }).populate("user", "firstName lastName email");

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    if (branch.audit?.isDeleted === true) {
      return res.status(403).json({
        success: false,
        message: "Entity admin will allow you to use this branch",
      });
    }

    const company = await COMPANY.findOne({ entityId: branch.entityId });

    const branchLogoBase64 = branch.branchLogo
      ? `data:image/png;base64,${branch.branchLogo.toString("base64")}`
      : null;

    res.json({
      success: true,
      data: {
        ...branch._doc,
        companyName: company?.companyName || null,
        branchLogo: branchLogoBase64,
      },
    });
  } catch (error) {
    console.log("Get Branch Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await BRANCH.findOne({ branchId: req.params.branchId });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const allowedFields = [
      "branchName",
      "branchCode",
      "contactInfo",
      "entityId",
      "branchDays",
      "branchTime",
    ];

    const auditFields = ["isActive", "isDeleted", "isVerified"];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "entityId") {
          const companyExists = await COMPANY.findOne({
            entityId: req.body.entityId,
          });
          if (!companyExists) {
            return res.status(400).json({
              success: false,
              message: "Invalid entityId, company not found",
            });
          }
        }

        if (field === "contactInfo") {
          if (typeof req.body[field] === "string") {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch {
              return res.status(400).json({
                success: false,
                message: "contactInfo must be valid JSON",
              });
            }
          }

          if (
            typeof req.body[field] !== "object" ||
            Array.isArray(req.body[field])
          ) {
            return res.status(400).json({
              success: false,
              message: "contactInfo must be an object",
            });
          }

          if (req.body.contactInfo.email) {
            const emailExists = await BRANCH.findOne({
              "contactInfo.email": req.body.contactInfo.email,
              branchId: { $ne: branch.branchId },
            });

            if (emailExists) {
              return res.status(400).json({
                success: false,
                message: "This email is already used in another branch",
              });
            }
          }

          req.body[field].userId = branch.contactInfo.userId || req.user.id;
        }

        if (field === "branchDays" && typeof req.body[field] === "string") {
          try {
            req.body[field] = JSON.parse(req.body[field]);
          } catch {
            return res.status(400).json({
              success: false,
              message: "branchDays must be valid JSON array",
            });
          }
        }

        if (field === "contactInfo") {
          if (typeof req.body[field] === "string") {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch {
              return res.status(400).json({
                success: false,
                message: "contactInfo must be valid JSON",
              });
            }
          }

          if (
            typeof req.body[field] !== "object" ||
            Array.isArray(req.body[field])
          ) {
            return res.status(400).json({
              success: false,
              message: "contactInfo must be an object",
            });
          }

          req.body[field].userId = branch.contactInfo.userId || req.user.id;
        }

        if (field === "branchTime" && typeof req.body[field] === "string") {
          try {
            req.body[field] = JSON.parse(req.body[field]);
          } catch {
            return res.status(400).json({
              success: false,
              message: "branchTime must be valid JSON object",
            });
          }
        }

        branch[field] = req.body[field];
      }
    }

    auditFields.forEach((auditField) => {
      if (req.body[auditField] !== undefined) {
        branch.audit[auditField] = req.body[auditField];
      }
    });

    branch.audit.updatedBy = req.user.id;

    if (req.body.isDeleted === true) {
      branch.audit.deletedBy = req.user.id;
    }

    if (req.file) {
      branch.branchLogo = req.file.buffer;
    }

    await branch.save();

    const company = await COMPANY.findOne({ entityId: branch.entityId });

    const branchLogoBase64 = branch.branchLogo
      ? `data:image/png;base64,${branch.branchLogo.toString("base64")}`
      : null;

    res.json({
      success: true,
      message: "Branch updated successfully",
      data: {
        ...branch._doc,
        companyName: company?.companyName || null,
        branchLogo: branchLogoBase64,
      },
    });
  } catch (error) {
    console.log("Update Branch Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.softDeleteBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    if (branchId.audit?.isDeleted === true) {
      return res.status(403).json({
        success: false,
        message:
          "Your Branch is disabled. Contact entity admin to enable your Branch.",
      });
    }

    const branch = await BRANCH.findOne({
      branchId,
      user: req.user.id,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found or not owned by this admin",
      });
    }

    const deletedBranch = await BRANCH.findByIdAndUpdate(
      branch._id,
      {
        $set: {
          "audit.isActive": false,
          "audit.isDeleted": true,
          "audit.deletedBy": req.user.id,
          "audit.updatedBy": req.user.id,
        },
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Branch soft-deleted successfully",
      data: deletedBranch,
    });
  } catch (error) {
    console.log("Soft Delete Branch Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
