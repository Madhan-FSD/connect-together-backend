import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { calculateAge } from "../utils/child.utils.js";

const ActivitySchema = new mongoose.Schema({
  subject: String,
  lessonsCompleted: Number,
  avgScore: Number,
  timeSpent: Number,
  date: { type: Date, default: Date.now },
});

const InsightSchema = new mongoose.Schema({
  summary: String,
  generatedAt: { type: Date, default: Date.now },
});

const CertificationSchema = new mongoose.Schema({
  name: String,
  issuingOrganization: String,
  issueDate: Date,
  expirationDate: Date,
  credentialUrl: String,
});

const ExperienceSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  startDate: Date,
  endDate: Date,
  description: String,
});

const EducationSchema = new mongoose.Schema({
  institution: String,
  degree: String,
  fieldOfStudy: String,
  startDate: Date,
  endDate: Date,
});

const AchievementSchema = new mongoose.Schema({
  name: String,
  issuer: String,
  issueDate: Date,
  description: String,
});

const SkillSchema = new mongoose.Schema({
  name: String,
  endorsements: { type: Number, default: 0 },
});

const ChildSkillSchema = new mongoose.Schema({
  name: String,
  proficiency: {
    type: String,
    enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
  },
});

const InterestItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
  followedSince: Date,
});

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  role: String,
  startDate: Date,
  endDate: Date,
  projectUrl: String,
});

const AddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, default: "India" },
  zipCode: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ["HOME", "WORK", "OTHER"],
    default: "HOME",
  },
});

const ChildSchema = new mongoose.Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
    },
    dob: { type: Date },
    accessCode: String,
    accessCodeHash: String,

    addresses: [AddressSchema],

    avatar: {
      url: { type: String },
      public_id: { type: String },
    },
    profileBanner: {
      url: { type: String },
      public_id: { type: String },
    },

    about: String,
    interests: [InterestItemSchema],
    skills: [ChildSkillSchema],
    certifications: [CertificationSchema],
    achievements: [AchievementSchema],
    projects: [ProjectSchema],
    educations: [EducationSchema],
    activities: [ActivitySchema],
    insights: [InsightSchema],

    permissions: {
      canCreateChannel: { type: Boolean, default: true },
      canPost: { type: Boolean, default: true },
      canComment: { type: Boolean, default: true },
      canLike: { type: Boolean, default: true },
      canUpdateCoreProfile: { type: Boolean, default: false },
      canAddSkills: { type: Boolean, default: true },
      canUpdateSkills: { type: Boolean, default: true },
      canDeleteSkills: { type: Boolean, default: true },
      canAddInterests: { type: Boolean, default: true },
      canUpdateInterests: { type: Boolean, default: true },
      canDeleteInterests: { type: Boolean, default: true },
      canAddCertifications: { type: Boolean, default: true },
      canUpdateCertifications: { type: Boolean, default: true },
      canDeleteCertifications: { type: Boolean, default: true },
      canAddAchievements: { type: Boolean, default: true },
      canUpdateAchievements: { type: Boolean, default: true },
      canDeleteAchievements: { type: Boolean, default: true },
      canAddProjects: { type: Boolean, default: true },
      canUpdateProjects: { type: Boolean, default: true },
      canDeleteProjects: { type: Boolean, default: true },
      canAddEducations: { type: Boolean, default: true },
      canUpdateEducations: { type: Boolean, default: true },
      canDeleteEducations: { type: Boolean, default: true },
      canAddAvatar: { type: Boolean, default: false },
      canUpdateAvatar: { type: Boolean, default: false },
      canDeleteAvatar: { type: Boolean, default: false },
      canAddProfileBanner: { type: Boolean, default: false },
      canUpdateProfileBanner: { type: Boolean, default: false },
      canDeleteProfileBanner: { type: Boolean, default: false },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ChildSchema.virtual("age").get(function () {
  return calculateAge(this.dob);
});

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    passwordHash: String,
    otp: String,
    otpExpiry: Date,
    isVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["NORMAL_USER", "PARENT", "CHILD"],
      default: "NORMAL_USER",
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "CHILD";
      },
      index: true,
    },
    firstName: String,
    lastName: String,
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
    },
    dob: { type: Date },
    mobile: {
      countryCode: String,
      phoneNumber: String,
    },

    addresses: [AddressSchema],

    avatar: {
      url: { type: String },
      public_id: { type: String },
    },
    profileBanner: {
      url: { type: String },
      public_id: { type: String },
    },

    profileHeadline: String,
    about: String,
    skills: [SkillSchema],
    certifications: [CertificationSchema],
    experiences: [ExperienceSchema],
    educations: [EducationSchema],
    interests: [InterestItemSchema],
    achievements: [AchievementSchema],
    projects: [ProjectSchema],

    featuredContent: {
      introHeadline: String,
      items: [
        {
          headline: String,
          summary: String,
          category: String,
        },
      ],
      generatedAt: Date,
    },
    children: [ChildSchema],
    connectionCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual("age").get(function () {
  return calculateAge(this.dob);
});

UserSchema.methods.setChildAccessCode = async function (child_id, code) {
  const child = this.children.id(child_id);

  if (!child) {
    throw new Error(`Child with _id ${child_id} not found.`);
  }

  const hash = await bcrypt.hash(code, 10);
  child.accessCodeHash = hash;
};

UserSchema.methods.verifyChildAccessCode = async function (child, code) {
  if (!child || !child.accessCodeHash) {
    console.warn(
      `Attempted to verify child PIN for ${
        child ? child.name : "Unknown"
      } but accessCodeHash is missing.`
    );
    return false;
  }

  return bcrypt.compare(code, child.accessCodeHash);
};

UserSchema.pre("save", async function (next) {
  const user = this;

  if (user.isModified("children")) {
    if (user.children.length > 0) {
      user.role = "PARENT";
    } else {
      user.role = "NORMAL_USER";
    }
  }

  if (user.isModified("passwordHash") && user.passwordHash) {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
  }

  if (user.isModified("children")) {
    for (const child of user.children) {
      if (child.accessCode && child.isModified("accessCode")) {
        const hash = await bcrypt.hash(child.accessCode, 10);
        child.accessCodeHash = hash;
        child.accessCode = undefined;
      }
    }
  }

  next();
});

const User = mongoose.model("User", UserSchema);
const Child = mongoose.model("Child", ChildSchema);

export { User, Child };
