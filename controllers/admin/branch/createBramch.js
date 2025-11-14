const BRANCH = require("../../../models/branch/branch");
const COMPANY = require("../../../models/companyInformation/company-information");
const { v4: uuidv4 } = require("uuid");

exports.createBranch = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can create branches",
      });
    }

    let {
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

    try {
      contactInfo = JSON.parse(contactInfo);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "contactInfo must be valid JSON",
      });
    }

    if (branchDays) {
      try {
        branchDays = JSON.parse(branchDays);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "branchOpenDays must be valid JSON array",
        });
      }
    }

    const isEmailUsed = await BRANCH.findOne({
      "contactInfo.email": contactInfo.email,
    });

    if (isEmailUsed) {
      return res.status(400).json({
        success: false,
        message: "This email is already used in another branch",
      });
    }

    if (branchTime) {
      try {
        branchTime = JSON.parse(branchTime);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "branchOpenTime must be valid JSON object",
        });
      }
    }

    contactInfo.userId = req.user.id;

    if (contactInfo.phone) {
      const cleanedPhone = String(contactInfo.phone).replace(/[^0-9]/g, "");
      if (cleanedPhone.length < 10 || cleanedPhone.length > 12) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number format",
        });
      }
      contactInfo.phone = Number(cleanedPhone);
    }

    const company = await COMPANY.findOne({ entityId });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Invalid entityId, company not found",
      });
    }

    const branchLogo = req.file ? req.file.buffer : null;
    const branchId = uuidv4();

    const newBranch = await BRANCH.create({
      branchId,
      user: req.user.id,
      branchName,
      branchCode,
      contactInfo,
      branchLogo,
      entityId,
      branchDays,
      branchTime,
      audit: {
        createdBy: req.user.id,
        updatedBy: req.user.id,
        deletedBy: req.user.id,
        isActive: true,
        isDeleted: false,
        isVerified: false,
      },
    });

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: newBranch,
    });
  } catch (error) {
    console.log("Create Branch Error:", error);
    res.status(500).json({
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
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update branches",
      });
    }

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
