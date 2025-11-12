const USER = require("../../../models/auth/user");
const BUSINESS = require("../../../models/business/business");

exports.addOrUpdateBusiness = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - only admin can add or update business data",
      });
    }

    const userId = req.user.id;
    const { businessName, businessCode, addressBusiness, buisnessAbout } =
      req.body;

    if (!businessName || !businessCode || !addressBusiness || !buisnessAbout) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const businessLogo = req.files?.businessLogo?.[0];
    const businessBanner = req.files?.businessBanner?.[0];

    if (!businessLogo || !businessBanner) {
      return res.status(400).json({
        success: false,
        message: "Both businessLogo and businessBanner are required",
      });
    }

    const businessData = {
      userId,
      businessName,
      businessCode,
      addressBusiness,
      buisnessAbout,
      busineessLogo: businessLogo.buffer,
      busineessBanner: businessBanner.buffer,
      contentType: businessLogo.mimetype,
      fileSizeKB: Math.round(businessLogo.size / 1024),
    };

    const existingBusiness = await BUSINESS.findOne({ userId });

    let savedBusiness;
    if (existingBusiness) {
      savedBusiness = await BUSINESS.findOneAndUpdate(
        { userId },
        { $set: businessData },
        { new: true },
      );
    } else {
      const newBusiness = new BUSINESS(businessData);
      savedBusiness = await newBusiness.save();
    }

    res.status(200).json({
      success: true,
      message: "Business information saved successfully",
      business: savedBusiness,
    });
  } catch (error) {
    console.error("Business Add Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getBusiness = async (req, res) => {
  try {
    const userId = req.user.id;
    const business = await BUSINESS.findOne({ userId });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No business data found for this user",
      });
    }

    const logoBase64 = business.busineessLogo
      ? `data:${business.contentType};base64,${business.busineessLogo.toString(
          "base64",
        )}`
      : null;

    const bannerBase64 = business.busineessBanner
      ? `data:${
          business.contentType
        };base64,${business.busineessBanner.toString("base64")}`
      : null;

    res.status(200).json({
      success: true,
      message: "Business data fetched successfully",
      business: {
        ...business.toObject(),
        busineessLogo: logoBase64,
        busineessBanner: bannerBase64,
      },
    });
  } catch (error) {
    console.error("Get Business Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
