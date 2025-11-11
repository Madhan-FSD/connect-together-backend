const USER = require("../../../models/auth/user");

exports.addOrUpdateBusiness = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(400).json({
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
      businessName,
      businessCode,
      buisnessAbout,
      addressBusiness,
      busineessLogo: businessLogo.buffer,
      busineessBanner: businessBanner.buffer,
      contentType: businessLogo.mimetype,
      fileSizeKB: Math.round(businessLogo.size / 1024),
    };

    const updateUser = await USER.findByIdAndUpdate(
      userId,
      { $set: { business: businessData } },
      { new: true, runValidators: true },
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Business information saved successfully",
      business: updateUser.business,
    });
  } catch (error) {
    console.log("Business Add Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getBusiness = async (req, res) => {
  try {
    const user = await USER.findById(req.user.id).select("business");

    if (!user.business) {
      return res
        .status(400)
        .json({ success: false, message: "No business data found" });
    }

    const { business } = user;

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
    console.log("Get Business Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
