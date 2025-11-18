const COMPANY_DATA = require("../../../models/companyInformation/company-information");
const { v4: uuidv4 } = require("uuid");

exports.addCompanyInformation = async (req, res) => {
  try {
    const entityAdminId = req.user.id;

    const existingCompany = await COMPANY_DATA.findOne({
      user: entityAdminId,
    });

    const {
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
    } = req.body;

    if (
      !established ||
      !communicationSource ||
      !sellerType ||
      !headquarters ||
      !description ||
      !website ||
      !contactEmail
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const newCompany = await COMPANY_DATA.create({
      entityId: uuidv4(),
      user: entityAdminId,
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
      role: req.user.role,
    });

    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message:
          "Company information already exists for this entity admin. Please use update API.",
        data: newCompany,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Company information added successfully",
      data: newCompany,
    });
  } catch (error) {
    console.log("Add Company Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.companyInformationProfile = async (req, res) => {
  try {
    const company = await COMPANY_DATA.findOne({
      entityId: req.params.id,
    }).populate("user", "firstName lastName email");

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company information profile data is not found",
      });
    }

    const companyLogoBase64 = company.companyLogo
      ? `data:image/png;base64,${company.companyLogo.toString("base64")}`
      : null;

    return res.json({
      success: true,
      data: {
        ...company._doc,
        companyLogo: companyLogoBase64,
      },
    });
  } catch (error) {
    console.log("Get One Company Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.updateCompanyInformation = async (req, res) => {
  try {
    const company = await COMPANY_DATA.findOne({ entityId: req.params.id });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided to update",
      });
    }

    const allowedFields = [
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

    await company.save();

    return res.json({
      success: true,
      message: "Company information updated successfully",
      data: {
        ...company._doc,
      },
    });
  } catch (error) {
    console.log("Update Company Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
