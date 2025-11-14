const mongoose = require("mongoose");

const CompanyInformationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },

    entityId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["entityAdmin", "BranchAdmin", "OpratorAdmin", "StaffAdmin"],
      default: "entityAdmin",
    },

    established: {
      type: Number,
      required: true,
    },

    communicationSource: {
      type: String,
      required: true,
    },

    sellerType: {
      type: String,
      required: true,
    },

    headquarters: {
      type: String,
      required: true,
    },

    companyLogo: {
      type: Buffer,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    website: {
      type: String,
      required: true,
    },

    contactEmail: {
      type: String,
      required: true,
    },

    facebookLink: { type: String },
    instagramLink: { type: String },
    youtubeLink: { type: String },
    linkedinLink: { type: String },
    twitterLink: { type: String },
    crunchbaseLink: { type: String },
    dealroomLink: { type: String },

    memberships: {
      type: [String],
      enum: [
        "AWS Activate Program",
        "EdLATAM Alliance",
        "inlab - IAL (Institute for Adult Learning)",
        "SuperCharger Ventures Acceleration Program",
        "Transcend Network Fellowship",
      ],
      default: [],
    },

    clients: {
      type: [String],
      enum: [
        "Bytescare",
        "EDT & Partners",
        "Education Alliance Finland",
        "Education Korea",
        "Education Technology Solutions (MSW Global)",
        "GESS Asia",
        "LeadSquared",
        "Singapore Education Network",
      ],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CompanyInformation", CompanyInformationSchema);
