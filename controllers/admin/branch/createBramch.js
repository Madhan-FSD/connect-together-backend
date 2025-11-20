const BRANCH = require("../../../models/branch/branch");
const COMPANY = require("../../../models/companyInformation/company-information");
const { v4: uuidv4 } = require("uuid");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../../utils/responseHandler");

exports.createBranch = async (req, res) => {
  try {
    const {
      branchName,
      branchCode,
      contactInfo,
      entityId,
      branchDays,
      branchTime,
      holidayData,
    } = req.body;

    let parsedHolidayData,
      parsedContactInfo,
      parsedBranchDays,
      parsedBranchTime;

    parsedContactInfo = JSON.parse(contactInfo);
    parsedBranchDays = branchDays ? JSON.parse(branchDays) : [];
    parsedBranchTime = branchTime ? JSON.parse(branchTime) : null;
    parsedHolidayData = holidayData ? JSON.parse(holidayData) : null;

    parsedContactInfo.userId = req.user.id;

    const generatedBranchId = uuidv4();

    if (parsedHolidayData) {
      parsedHolidayData.branchId = generatedBranchId;
      parsedHolidayData.unquicId = uuidv4();

      if (parsedHolidayData.hoildayTypes === true) {
        parsedHolidayData.openingTime = null;
        parsedHolidayData.closingTime = null;
      }

      if (parsedHolidayData.hoildayTypes === false) {
        if (!parsedHolidayData.openingTime || !parsedHolidayData.closingTime) {
          return responseHandler(
            res,
            STATUS.BAD,
            "For half holiday, opening & closing time required",
          );
        }
      }
    }

    const newBranch = await BRANCH.create({
      branchId: generatedBranchId,
      user: req.user.id,
      branchName,
      branchCode,
      contactInfo: parsedContactInfo,
      branchLogo: req.file ? req.file.buffer : null,
      branchDays: parsedBranchDays,
      branchTime: parsedBranchTime,
      entityId,
      holidayBranch: parsedHolidayData,
      audit: {
        createdBy: req.user.id,
        updatedBy: req.user.id,
        isActive: true,
        isDeleted: false,
        isVerified: false,
      },
      role: { role: "BranchAdmin" },
    });

    return responseHandler(res, STATUS.CREATED, "Branch created successfully", {
      data: newBranch,
    });
  } catch (error) {
    console.log("Create Branch Error:", error);
    if (
      error.code === 11000 &&
      error.keyPattern &&
      error.keyPattern["contactInfo.email"]
    ) {
      return responseHandler(
        res,
        STATUS.BAD,
        "This email is already used in another branch. Please use a different email.",
      );
    }
    return errorResponse(res, error);
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const branch = await BRANCH.findOne({ branchId: req.params.branchId });

    if (!branch) {
      return responseHandler(res, STATUS.NOT_FOUND, "Branch not found");
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
            return responseHandler(
              res,
              STATUS.BAD,
              "Invalid entityId. Company does not exist.",
            );
          }
        }

        if (field === "contactInfo") {
          if (typeof req.body[field] === "string") {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch {
              return responseHandler(
                res,
                STATUS.BAD,
                "contactInfo must be valid JSON",
              );
            }
          }

          if (
            typeof req.body[field] !== "object" ||
            Array.isArray(req.body[field])
          ) {
            return responseHandler(
              res,
              STATUS.BAD,
              "contactInfo must be an object",
            );
          }

          if (req.body.contactInfo.email) {
            const emailExists = await BRANCH.findOne({
              "contactInfo.email": req.body.contactInfo.email,
              branchId: { $ne: branch.branchId },
            });

            if (emailExists) {
              return responseHandler(
                res,
                STATUS.BAD,
                "This email is already used in another branch. Please use a different email.",
              );
            }
          }

          req.body[field].userId = branch.contactInfo.userId || req.user.id;
        }

        if (field === "branchDays" && typeof req.body[field] === "string") {
          try {
            req.body[field] = JSON.parse(req.body[field]);
          } catch {
            return responseHandler(
              res,
              STATUS.BAD,
              "branchDays must be valid JSON array",
            );
          }
        }

        if (field === "contactInfo") {
          if (typeof req.body[field] === "string") {
            try {
              req.body[field] = JSON.parse(req.body[field]);
            } catch {
              return responseHandler(
                res,
                STATUS.BAD,
                "contactInfo must be valid JSON",
              );
            }
          }

          if (
            typeof req.body[field] !== "object" ||
            Array.isArray(req.body[field])
          ) {
            return responseHandler(
              res,
              STATUS.BAD,
              "contactInfo must be an object",
            );
          }

          req.body[field].userId = branch.contactInfo.userId || req.user.id;
        }

        if (field === "branchTime" && typeof req.body[field] === "string") {
          try {
            req.body[field] = JSON.parse(req.body[field]);
          } catch {
            return responseHandler(
              res,
              STATUS.BAD,
              "branchTime must be valid JSON",
            );
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

    return responseHandler(res, STATUS.OK, "Branch updated successfully", {
      ...branch._doc,
      companyName: company?.companyName || null,
      branchLogo: branchLogoBase64,
    });
  } catch (error) {
    console.log("Update Branch Error:", error);
    return errorResponse(res, error);
  }
};
