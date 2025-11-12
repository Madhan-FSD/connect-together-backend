const Institution = require("../../../models/Institution/Institution");
const Enquiry = require("../../../models/Institution/Enquiry");
const getEnquiryEmailTemplate = require("../../../templates/enquiryTemplate");
const getEnquiryStatusEmailTemplate = require("../../../templates/getEnquiryStatusEmailTemplate");
const nodemailer = require("nodemailer");

exports.createInstitution = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const inst = await Institution.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Institution created successfully",
      institution: inst,
    });
  } catch (err) {
    console.error("Create Institution Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listInstitutions = async (req, res) => {
  try {
    let {
      q,
      type,
      city,
      state,
      country,
      isActive,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (q) filter.name = { $regex: q.trim(), $options: "i" };
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (city) filter["location.city"] = { $regex: city, $options: "i" };
    if (state) filter["location.state"] = { $regex: state, $options: "i" };
    if (country)
      filter["location.country"] = { $regex: country, $options: "i" };

    const sortOrder = order === "asc" ? 1 : -1;
    const sortObj = { [sortBy]: sortOrder };

    const items = await Institution.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Institution.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Institutions fetched successfully",
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("List Institutions Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.enquireInstitution = async (req, res) => {
  try {
    const { institutionId, message } = req.body;
    const userId = req.user.id;

    const institution = await Institution.findById(institutionId).lean();
    if (!institution) {
      return res
        .status(404)
        .json({ success: false, message: "Institution not found" });
    }

    const existing = await Enquiry.findOne({
      institutionId,
      userId,
      status: { $ne: "closed" },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already applied or enquired for this institution.",
      });
    }

    const enquiry = await Enquiry.create({
      institutionId,
      userId,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      userPhone: req.user.phone,
      message,
    });

    const emailHTML = getEnquiryEmailTemplate({
      institutionName: institution.name,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      userPhone: req.user.phone,
      message,
    });

    if (institution.contactEmail) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.NODEMALLER_EMAIL,
          pass: process.env.NODEMALLER_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.NODEMALLER_EMAIL,
        to: institution.contactEmail,
        subject: `New Enquiry for ${institution.name}`,
        html: emailHTML,
      });
    }

    res.status(200).json({
      success: true,
      message: "Enquiry submitted successfully",
      enquiry,
    });
  } catch (err) {
    console.error("Enquiry Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listEnquiries = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    let {
      q,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    if (q && q.trim) {
      const searchRegex = { $regex: q.trim(), $options: "i" };

      filter.$or = [
        { userEmail: searchRegex },
        { userName: searchRegex },
        { message: searchRegex },
      ];
    }

    if (status) filter.status = status;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const sortObj = { [sortBy]: sortOrder };

    const enquiries = await Enquiry.find(filter)
      .populate("userId", "firstName lastName email phone")
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Enquiry.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Enquiries fetched successfully",
      data: enquiries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
      filtersUsed: filter,
    });
  } catch (err) {
    console.log("List Enquiries Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateEnquiryStatus = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { enquiryId, status } = req.body;

    const allowedStatuses = ["pending", "accepted", "rejected", "closed"];
    if (!allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const enquiry = await Enquiry.findById(enquiryId)
      .populate("institutionId", "name contactEmail")
      .populate("userId", "firstName lastName email")
      .lean();

    if (!enquiry) {
      return res
        .status(404)
        .json({ success: false, message: "Enquiry not found" });
    }

    const updatedEnquiry = await Enquiry.findByIdAndUpdate(
      enquiryId,
      { status },
      { new: true },
    );

    const emailTemplate = getEnquiryStatusEmailTemplate({
      userName: `${enquiry.userId.firstName} ${enquiry.userId.lastName}`,
      institutionName: enquiry.institutionId.name,
      message: enquiry.message,
      status,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMALLER_EMAIL,
        pass: process.env.NODEMALLER_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.NODEMALLER_EMAIL,
      to: enquiry.userId.email,
      subject: `Your Enquiry Status: ${status.toUpperCase()}`,
      html: emailTemplate,
    });

    res.status(200).json({
      success: true,
      message: "Enquiry status updated and email sent successfully",
      enquiry: updatedEnquiry,
    });
  } catch (err) {
    console.error("Update Enquiry Status Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
