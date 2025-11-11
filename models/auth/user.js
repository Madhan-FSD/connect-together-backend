const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  address: { type: String, required: true },
  pinCode: { type: Number, required: true },
  countryName: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  phone: { type: Number },
  alternativeNumber: { type: Number },
});

const businessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  businessCode: { type: String, required: true },
  contentType: { type: String },
  fileSizeKB: { type: Number },
  addressBusiness: { type: String, required: true },
  buisnessAbout: { type: String, required: true },
  busineessLogo: { type: Buffer },
  busineessBanner: { type: Buffer },
});

// Child schema (same as yours)
const ChildSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    age: { type: Number },
    relation: {
      type: String,
      enum: [
        "mother",
        "father",
        "sister",
        "brother",
        "grandmother",
        "grandfather",
        "mother-in-law",
        "father-in-law",
        "sibling",
        "other",
      ],
    },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    photo: { type: String },
    phone: { type: String },
    email: { type: String },
    skills: [String],
    hobbies: [String],
    achievements: [String],
    education: { type: String },
    goals: { type: String },
    projects: [String],
    pin: { type: String, minlength: 6, maxlength: 6 },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  },
  { timestamps: true },
);

const UserSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    countryCode: { type: String, default: "+91" },
    password: { type: String, required: true },
    userType: {
      type: String,
      enum: ["normal", "parent", "admin"],
      default: "normal",
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isVerifed: { type: Boolean, default: false },
    hasChild: { type: Boolean, default: false },
    gender: { type: String },
    pin: { type: String, minlength: 6, maxlength: 6 },
    children: [ChildSchema],
    googleId: { type: String, unique: true, sparse: true },
    loginProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    photo: { type: String },
    address: addressSchema,
    business: businessSchema,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Users", UserSchema);
