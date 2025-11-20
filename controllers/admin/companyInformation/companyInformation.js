const COMPANY_DATA = require("../../../models/companyInformation/company-information");
const { v4: uuidv4 } = require("uuid");
const {
  STATUS,
  errorResponse,
  responseHandler,
} = require("../../../utils/responseHandler");

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
      return responseHandler(
        res,
        STATUS.BAD,
        "established, communicationSource, sellerType, headquarters, description, website, and contactEmail are required",
      );
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
      return responseHandler(
        res,
        STATUS.BAD,
        "Company information already exists for this entity admin",
      );
    }

    return responseHandler(
      res,
      STATUS.CREATED,
      "Company information added successfully",
      newCompany,
    );
  } catch (error) {
    console.log("Add Company Error:", error);
    return errorResponse(res, error);
  }
};

exports.companyInformationProfile = async (req, res) => {
  try {
    const company = await COMPANY_DATA.findOne({
      entityId: req.params.id,
    }).populate("user", "firstName lastName email");

    if (!company) {
      return responseHandler(res, STATUS.NOT_FOUND, "Company not found");
    }

    const companyLogoBase64 = company.companyLogo
      ? `data:image/png;base64,${company.companyLogo.toString("base64")}`
      : null;

    return responseHandler(res, STATUS.OK, "Company fetched successfully", {
      ...company._doc,
      companyLogo: companyLogoBase64,
    });
  } catch (error) {
    console.log("Get One Company Error:", error);
    return errorResponse(res, error);
  }
};

exports.updateCompanyInformation = async (req, res) => {
  try {
    const company = await COMPANY_DATA.findOne({ entityId: req.params.id });

    if (!company) {
      return responseHandler(res, STATUS.NOT_FOUND, "Company not found");
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return responseHandler(res, STATUS.BAD, "No fields provided for update");
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

    return responseHandler(
      res,
      STATUS.OK,
      "Company information updated successfully",
      company,
    );
  } catch (error) {
    console.log("Update Company Error:", error);
    return errorResponse(res, error);
  }
};
