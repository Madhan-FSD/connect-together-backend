const COMPANY_DATA = require("../../../models/companyInformation/company-information");

exports.addCompanyInformation = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - only admin can add company information",
      });
    }

    const {
      companyName,
      established,
      communicationSource,
      sellerType,
      headquarters,
      description,
      website,
      contactEmail,
      facebookLink,
      instagramLink,
      youtubeLink,
      linkedinLink,
      twitterLink,
      crunchbaseLink,
      dealroomLink,
      memberships,
      clients,
      role,
    } = req.body;

    const companyLogo = req.file ? req.file.buffer : null;

    const newCompany = await COMPANY_DATA.create({
      userId: req.user.id,
      companyName,
      role,
      established,
      communicationSource,
      sellerType,
      headquarters,
      companyLogo,
      description,
      website,
      contactEmail,
      facebookLink,
      instagramLink,
      youtubeLink,
      linkedinLink,
      twitterLink,
      crunchbaseLink,
      dealroomLink,
      memberships,
      clients,
    });

    res.status(201).json({
      success: true,
      message: "Company information added successfully",
      data: newCompany,
    });
  } catch (error) {
    console.log("Add Company Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.companyInformationProfile = async (req, res) => {
  try {
    const company = await COMPANY_DATA.findById(req.params.id).populate(
      "userId",
      "firstName lastName email",
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company information profile data is not found",
      });
    }

    const companyLogoBase64 = company.companyLogo
      ? `data:image/png;base64,${company.companyLogo.toString("base64")}`
      : null;

    res.json({
      success: true,
      data: {
        ...company._doc,
        companyLogo: companyLogoBase64,
      },
    });
  } catch (error) {
    console.log("Get One Company Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateCompanyInformation = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - only admin can update company information",
      });
    }

    const company = await COMPANY_DATA.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const allowedFields = [
      "companyName",
      "established",
      "communicationSource",
      "sellerType",
      "headquarters",
      "description",
      "website",
      "contactEmail",
      "facebookLink",
      "instagramLink",
      "youtubeLink",
      "linkedinLink",
      "twitterLink",
      "crunchbaseLink",
      "dealroomLink",
      "memberships",
      "clients",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    if (req.file) {
      company.companyLogo = req.file.buffer;
    }

    await company.save();

    const companyLogoBase64 = company.companyLogo
      ? `data:image/png;base64,${company.companyLogo.toString("base64")}`
      : null;

    res.json({
      success: true,
      message: "Company information updated successfully",
      data: {
        ...company._doc,
        companyLogo: companyLogoBase64,
      },
    });
  } catch (error) {
    console.log("Update Company Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
