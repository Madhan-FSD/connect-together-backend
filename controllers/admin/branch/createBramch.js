const BRANCH = require("../../../models/branch/branch");
const COMPANY = require("../../../models/companyInformation/company-information");

exports.createBranch = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can create branches",
      });
    }

    const { branchName, branchCode, contactInfo, entityId } = req.body;

    if (!branchName || !branchCode || !contactInfo || !entityId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const company = await COMPANY.findById(entityId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Invalid entityId, company not found",
      });
    }

    const branchLogo = req.file ? req.file.buffer : null;

    const newBranch = await BRANCH.create({
      userId: req.user.id,
      branchName,
      branchCode,
      contactInfo,
      branchLogo,
      entityId,
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
    const { entityId, userId } = req.query;

    let filter = {};

    if (entityId) filter.entityId = entityId;
    if (userId) filter.userId = userId;

    const branches = await BRANCH.find(filter)
      .populate("userId", "firstName lastName email")
      .populate("entityId", "companyName");

    const dataWithLogo = branches.map((b) => ({
      ...b._doc,
      branchLogo: b.branchLogo
        ? `data:image/png;base64,${b.branchLogo.toString("base64")}`
        : null,
    }));

    res.json({
      success: true,
      count: branches.length,
      data: dataWithLogo,
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
    const branch = await BRANCH.findById(req.params.id)
      .populate("userId", "firstName lastName email")
      .populate("entityId", "companyName");

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const branchLogoBase64 = branch.branchLogo
      ? `data:image/png;base64,${branch.branchLogo.toString("base64")}`
      : null;

    res.json({
      success: true,
      data: {
        ...branch._doc,
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

    const branch = await BRANCH.findById(req.params.id);

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
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        branch[field] = req.body[field];
      }
    });

    if (req.file) {
      branch.branchLogo = req.file.buffer;
    }

    await branch.save();

    const branchLogoBase64 = branch.branchLogo
      ? `data:image/png;base64,${branch.branchLogo.toString("base64")}`
      : null;

    res.json({
      success: true,
      message: "Branch updated successfully",
      data: {
        ...branch._doc,
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
