const BUSINESS = require("../../../models/business/business");
const { v4: uuidv4 } = require("uuid");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../../utils/responseHandler");

exports.createBusiness = async (req, res) => {
  try {
    const {
      businessName,
      businessCode,
      addressBusiness,
      buisnessAbout,
      createdBy,
    } = req.body;

    if (!businessName || !businessCode || !addressBusiness || !buisnessAbout) {
      return responseHandler(
        res,
        STATUS.BAD,
        "businessName, businessCode, addressBusiness, and buisnessAbout are required",
      );
    }

    const existingBusiness = await BUSINESS.findOne({ ownerId: req.user.id });

    if (existingBusiness) {
      return responseHandler(
        res,
        STATUS.BAD,
        "Business already exists for this admin",
      );
    }

    let logoBase64 = null;
    let bannerBase64 = null;

    if (req.files?.businessLogo) {
      logoBase64 = req.files.businessLogo[0].buffer.toString("base64");
    }

    if (req.files?.businessBanner) {
      bannerBase64 = req.files.businessBanner[0].buffer.toString("base64");
    }

    const newBusiness = new BUSINESS({
      businessId: uuidv4(),
      ownerId: req.user.id,
      businessName,
      businessCode,
      addressBusiness,
      buisnessAbout,
      busineessLogo: logoBase64,
      busineessBanner: bannerBase64,
      audit: {
        createdBy: createdBy || req.user.id,
        updatedBy: null,
        deletedBy: null,
        isActive: true,
        isDeleted: false,
        isVerified: false,
      },
    });

    await newBusiness.save();

    return responseHandler(
      res,
      STATUS.CREATED,
      "Business created successfully",
      newBusiness,
    );
  } catch (err) {
    console.log("Register Business Error:", err);
    return errorResponse(res, err);
  }
};

exports.getBusinessProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const businessId = req.params.businessId || req.query.businessId;

    let business;

    if (userId && !businessId) {
      business = await BUSINESS.findOne({ ownerId: userId })
        .populate("ownerId", "userId firstName lastName email phone role")
        .lean();
    }

    if (businessId && !business) {
      business = await BUSINESS.findOne({ businessId })
        .populate("ownerId", "userId firstName lastName email phone role")
        .lean();
    }

    if (userId && businessId) {
      business = await BUSINESS.findOne({
        businessId,
        ownerId: userId,
      })
        .populate("ownerId", "userId firstName lastName email phone  role")
        .lean();
    }

    if (!business) {
      return responseHandler(res, STATUS.NOT_FOUND, "Business not found");
    }

    if (business.audit?.isDeleted === true) {
      return responseHandler(
        res,
        STATUS.BAD,
        "Your profile is disabled. Contact super admin to enable your profile.",
      );
    }

    const logoBase64 = business.busineessLogo
      ? `data:image/png;base64,${business.busineessLogo}`
      : null;

    const bannerBase64 = business.busineessBanner
      ? `data:image/png;base64,${business.busineessBanner}`
      : null;

    return responseHandler(
      res,
      STATUS.OK,
      "Business profile fetched successfully",
      {
        ...business,
        busineessLogo: logoBase64,
        busineessBanner: bannerBase64,
      },
    );
  } catch (error) {
    console.error("Get Business Profile Error:", error);
    return errorResponse(res, error);
  }
};

exports.editBusiness = async (req, res) => {
  try {
    const business = await BUSINESS.findOne({ ownerId: req.user.id });

    if (!business) {
      return responseHandler(
        res,
        STATUS.NOT_FOUND,
        "Business not found for this admin",
      );
    }

    if (business.audit?.isDeleted === true) {
      return responseHandler(
        res,
        STATUS.BAD,
        "Your profile is disabled. Contact super admin to enable your profile.",
      );
    }

    const updatable = [
      "businessName",
      "businessCode",
      "addressBusiness",
      "buisnessAbout",
    ];

    const updateObj = {};

    updatable.forEach((key) => {
      if (req.body[key]) updateObj[key] = req.body[key];
    });

    if (req.files?.businessLogo) {
      updateObj.busineessLogo =
        req.files.businessLogo[0].buffer.toString("base64");
    }

    if (req.files?.businessBanner) {
      updateObj.busineessBanner =
        req.files.businessBanner[0].buffer.toString("base64");
    }

    updateObj["audit.updatedBy"] = req.user.id;

    const updatedBusiness = await BUSINESS.findByIdAndUpdate(
      business._id,
      { $set: updateObj },
      { new: true },
    );

    return responseHandler(
      res,
      STATUS.OK,
      "Business updated successfully",
      updatedBusiness,
    );
  } catch (err) {
    console.log("Edit Business Error:", err);
    return errorResponse(res, err);
  }
};

exports.softDeleteBusiness = async (req, res) => {
  try {
    const business = await BUSINESS.findOne({
      businessId: req.params.businessId,
    });

    if (!business) {
      return responseHandler(res, STATUS.NOT_FOUND, "Business not found");
    }
    if (business.audit?.isDeleted === true) {
      return responseHandler(
        res,
        STATUS.BAD,
        "Your profile is disabled. Contact super admin to enable your profile.",
      );
    }

    return responseHandler(res, STATUS.OK, "Business deleted successfully");
  } catch (err) {
    console.log("Soft Delete Error:", err);
    return errorResponse(res, err);
  }
};
