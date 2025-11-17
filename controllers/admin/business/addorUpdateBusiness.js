const BUSINESS = require("../../../models/business/business");
const { v4: uuidv4 } = require("uuid");

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
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    let logoBase64 = null;
    let bannerBase64 = null;

    if (req.files && req.files.businessLogo) {
      logoBase64 = req.files.businessLogo[0].buffer.toString("base64");
    }

    if (req.files && req.files.businessBanner) {
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
        createdBy: createdBy || null,
        updatedBy: null,
        deletedBy: null,
        isActive: true,
        isDeleted: false,
        isVerified: false,
      },
    });

    await newBusiness.save();

    res.status(201).json({
      success: true,
      message: "Business registered successfully",
      businessId: newBusiness.businessId,
    });
  } catch (err) {
    console.log("Register Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getBusinessProfile = async (req, res) => {
  try {
    const business = await BUSINESS.findOne({
      ownerId: req.user.id,
    }).lean();

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found for this admin",
      });
    }

    const logoBase64 = business.busineessLogo
      ? `data:image/png;base64,${business.busineessLogo}`
      : null;

    const bannerBase64 = business.busineessBanner
      ? `data:image/png;base64,${business.busineessBanner}`
      : null;

    return res.status(200).json({
      success: true,
      message: "Business profile fetched successfully",
      business: {
        ...business,
        busineessLogo: logoBase64,
        busineessBanner: bannerBase64,
      },
    });
  } catch (error) {
    console.error("Get Business Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.editBusiness = async (req, res) => {
  try {
    const business = await BUSINESS.findOne({ ownerId: req.user.id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found for this admin",
      });
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

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      business: updatedBusiness,
    });
  } catch (err) {
    console.log("Edit Business Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.softDeleteBusiness = async (req, res) => {
  try {
    const business = await BUSINESS.findOne({ ownerId: req.user.id });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found for this admin",
      });
    }

    const deletedBusiness = await BUSINESS.findByIdAndUpdate(
      business._id,
      {
        $set: {
          "audit.isActive": false,
          "audit.isDeleted": true,
          "audit.deletedBy": req.user.id,
        },
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Business soft-deleted successfully",
      business: deletedBusiness,
    });
  } catch (err) {
    console.log("Soft Delete Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
