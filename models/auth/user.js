const mongoose = require("mongoose");
const auditSchema = require("../common/audit.Schema");
const roleSchema = require("../common/role.Schema");

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
    username: { type: String, unique: true },
    phone: { type: String, required: true, unique: true },
    countryCode: { type: String, default: "+91" },
    password: { type: String, required: true },
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
    audit: auditSchema,
    role: roleSchema,
  },
  { timestamps: true },
);

// Pre-save hook to automatically set username from email
UserSchema.pre("save", function (next) {
  if (this.isNew && !this.username && this.email) {
    this.username = this.email.split("@")[0];
  }
  next();
});

export default mongoose.model("Users", UserSchema);
