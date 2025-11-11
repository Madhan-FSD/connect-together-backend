import { User } from "../../models/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { enforcePermissionAndLog } from "../../utils/permissions.js";
import { validateInput } from "../../utils/validator.js";
import { deleteFromCloudinary } from "../../utils/cloudinary.js";
import mongoose from "mongoose";
import { calculateAge } from "../../utils/child.utils.js";

export const findChild = (user, childId) => {
  if (!user) throw new ApiError("User not found", 404);

  if (user.role === "CHILD") {
    if (user._id.toString() !== childId.toString()) {
      throw new ApiError(
        "Access denied. You can only access your own profile.",
        403
      );
    }
    const child = user;
    child.age = calculateAge(child.dob);
    return child;
  }

  if (!Array.isArray(user.children) || user.children.length === 0) {
    throw new ApiError("This parent has no child profiles.", 404);
  }

  const child = user.children.find(
    (c) => c._id.toString() === childId.toString()
  );

  if (!child) {
    throw new ApiError("Child not found under this parent account.", 404);
  }

  child.age = calculateAge(child.dob);
  return child;
};

const getLogType = (role, action) => {
  const prefix = role === "CHILD" ? "CHILD" : "PARENT";
  return `${prefix}_${action}`;
};

export const getFullProfileForChild = asyncHandler(async (req, res) => {
  const { childId } = req.params;

  if (!childId) {
    return res.status(400).json({ message: "Child ID is required." });
  }

  const parent = await User.findOne(
    { "children._id": childId },
    {
      _id: 1,
      firstName: 1,
      lastName: 1,
      email: 1,
      children: { $elemMatch: { _id: childId } },
    }
  ).lean();

  if (!parent || !parent.children?.length) {
    return res.status(404).json({ message: "Child profile not found." });
  }

  const child = parent.children[0];
  const age = calculateAge(child.dob);

  const fullProfile = {
    _id: child._id,
    firstName: child.firstName,
    lastName: child.lastName,
    gender: child.gender,
    dob: child.dob,
    age: age,
    addresses: child.addresses,
    avatar: child.avatar,
    profileBanner: child.profileBanner,
    about: child.about,
    interests: child.interests,
    skills: child.skills,
    certifications: child.certifications,
    achievements: child.achievements,
    projects: child.projects,
    educations: child.educations,
    activities: child.activities,
    insights: child.insights,
    permissions: child.permissions,
    createdAt: child.createdAt,
    parent: {
      id: parent._id,
      firstName: parent.firstName,
      lastName: parent.lastName,
      email: parent.email,
    },
  };

  return res.status(200).json(fullProfile);
});

export const getChildCoreProfile = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  res.status(200).json({
    firstName: child.firstName,
    lastName: child.lastName,
    gender: child.gender,
    dob: child.dob,
    age: child.age,
    about: child.about,
    permissions: child.permissions,
  });
});

export const getChildAddresses = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  res
    .status(200)
    .json({ addresses: child.addresses, permissions: child.permissions });
});

export const addChildAddress = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, [
    "street",
    "city",
    "state",
    "zipCode",
  ]);
  const logType = getLogType(role, "ADDED_ADDRESS");

  const permissionKey = "canUpdateCoreProfile";

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Added Address in ${validatedData.city}, ${validatedData.zipCode}`
  );

  child.addresses.push(validatedData);
  await req.user.save();

  res
    .status(201)
    .json({ addresses: child.addresses, permissions: child.permissions });
});

export const updateChildAddress = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body);
  const logType = getLogType(role, "UPDATED_ADDRESS");
  const permissionKey = "canUpdateCoreProfile";

  const address = child.addresses.id(req.params.addressId);
  if (!address) throw new ApiError("Child address not found.", 404);

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Updated Address ID ${req.params.addressId}`
  );

  Object.assign(address, validatedData);
  await req.user.save();

  res.status(200).json({ address, permissions: child.permissions });
});

export const deleteChildAddress = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const permissionKey = "canUpdateCoreProfile";

  const address = child.addresses.id(req.params.addressId);
  if (!address) throw new ApiError("Child address not found.", 404);
  const logType = getLogType(role, "DELETED_ADDRESS");

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Deleted Address in ${address.city}, ${address.zipCode}`
  );

  await address.deleteOne();
  await req.user.save();

  res.status(204).send();
});

export const updateChildCoreProfile = asyncHandler(async (req, res) => {
  const { childId } = req.params;

  if (!childId) throw new ApiError("Child ID is required.", 400);

  const child = findChild(req.user, childId);
  if (!child) throw new ApiError("Child not found.", 404);

  if (!child.permissions?.canUpdateCoreProfile) {
    throw new ApiError(
      "Access denied. You are not allowed to update core profile details.",
      403
    );
  }

  const allowedFields = ["firstName", "lastName", "gender", "dob", "about"];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(
      ([key, value]) => allowedFields.includes(key) && value !== undefined
    )
  );

  if (updates.dob) {
    updates.dob = new Date(updates.dob);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError("No valid fields provided for update.", 400);
  }

  Object.assign(child, updates);

  const changedFields = Object.keys(updates).join(", ");
  const logType = "CHILD_UPDATED_CORE_PROFILE";
  const logMessage = `Updated core profile fields (${changedFields}) for child ${child.firstName} ${child.lastName}.`;

  await enforcePermissionAndLog(
    req,
    child,
    "canUpdateCoreProfile",
    logType,
    logMessage
  );

  if (req.user.role === "PARENT") {
    req.user.markModified("children");
    await req.user.save();
  } else if (req.user.role === "CHILD") {
    await User.findByIdAndUpdate(childId, { $set: updates });
  }

  return res.status(200).json({
    message: "Child core profile updated successfully.",
    child: {
      _id: child._id,
      firstName: child.firstName,
      lastName: child.lastName,
      gender: child.gender,
      dob: child.dob,
      age: calculateAge(child.dob),
      about: child.about,
      avatar: child.avatar,
      profileBanner: child.profileBanner,
      permissions: child.permissions,
      parent:
        req.user.role === "PARENT"
          ? { id: req.user._id, email: req.user.email }
          : child.parentId
          ? { id: child.parentId }
          : null,
    },
  });
});

export const getChildAvatar = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  if (!child.avatar)
    return res.status(404).json({ message: "No avatar found for this child." });
  res
    .status(200)
    .json({ avatar: child.avatar, permissions: child.permissions });
});

export const updateChildAvatar = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const isParentOrAdmin = ["PARENT", "ADMIN"].includes(role.toUpperCase());
  const avatarFile = req.file;

  if (!avatarFile) {
    return res.status(400).json({ message: "Avatar file is required." });
  }

  const hasAvatar = !!child.avatar?.url;

  if (
    (!isParentOrAdmin && !child.permissions.canUpdateAvatar) ||
    (!isParentOrAdmin && !hasAvatar && !child.permissions.canAddAvatar)
  ) {
    return res.status(403).json({
      message: "You are not allowed to upload or update avatar.",
    });
  }

  if (!isParentOrAdmin && !hasAvatar) {
    child.permissions.canAddAvatar = false;
  }

  if (child.avatar?.public_id) {
    await deleteFromCloudinary(child.avatar.public_id);
  }

  const uploadedAvatar = await uploadOnCloudinary(
    avatarFile.path,
    `children/${child._id}/avatar`
  );

  if (!uploadedAvatar) {
    return res.status(500).json({ message: "Failed to upload avatar." });
  }

  child.avatar = {
    url: uploadedAvatar.secure_url,
    public_id: uploadedAvatar.public_id,
  };

  await req.user.save();

  res.status(200).json({
    message: "Avatar updated successfully.",
    avatar: child.avatar,
    permissions: child.permissions,
  });
});

export const deleteChildAvatar = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const isParentOrAdmin = ["PARENT", "ADMIN"].includes(role.toUpperCase());

  if (!child.avatar?.public_id)
    return res.status(400).json({ message: "No avatar found to delete." });

  if (!isParentOrAdmin && !child.permissions.canDeleteAvatar) {
    return res
      .status(403)
      .json({ message: "You are not allowed to delete avatar." });
  }

  if (child.avatar.public_id) {
    await deleteFromCloudinary(child.avatar.public_id);
  }

  child.avatar = null;

  await req.user.save();

  res.status(204).send();
});

export const getChildProfileBanner = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  if (!child.profileBanner)
    return res
      .status(404)
      .json({ message: "No profile banner found for this child." });
  res.status(200).json({
    profileBanner: child.profileBanner,
    permissions: child.permissions,
  });
});

export const updateChildProfileBanner = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const isParentOrAdmin = ["PARENT", "ADMIN"].includes(role.toUpperCase());
  const bannerFile = req.file;

  if (!bannerFile) {
    return res
      .status(400)
      .json({ message: "Profile banner file is required." });
  }

  const hasBanner = !!child.profileBanner?.url;

  if (
    (!isParentOrAdmin && !child.permissions.canUpdateProfileBanner) ||
    (!isParentOrAdmin && !hasBanner && !child.permissions.canAddProfileBanner)
  ) {
    return res.status(403).json({
      message: "You are not allowed to upload or update profile banner.",
    });
  }

  if (!isParentOrAdmin && !hasBanner) {
    child.permissions.canAddProfileBanner = false;
  }

  if (child.profileBanner?.public_id) {
    await deleteFromCloudinary(child.profileBanner.public_id);
  }

  const uploadedBanner = await uploadOnCloudinary(
    bannerFile.path,
    `children/${child._id}/profileBanner`
  );

  if (!uploadedBanner) {
    return res
      .status(500)
      .json({ message: "Failed to upload profile banner." });
  }

  child.profileBanner = {
    url: uploadedBanner.secure_url,
    public_id: uploadedBanner.public_id,
  };

  await req.user.save();

  res.status(200).json({
    message: "Profile banner updated successfully.",
    profileBanner: child.profileBanner,
    permissions: child.permissions,
  });
});

export const deleteChildProfileBanner = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const isParentOrAdmin = ["PARENT", "ADMIN"].includes(role.toUpperCase());

  if (!child.profileBanner?.public_id)
    return res
      .status(400)
      .json({ message: "No profile banner found to delete." });

  if (!isParentOrAdmin && !child.permissions.canDeleteProfileBanner) {
    return res
      .status(403)
      .json({ message: "You are not allowed to delete profile banner." });
  }

  if (child.profileBanner?.public_id) {
    await deleteFromCloudinary(child.profileBanner.public_id);
  }

  child.profileBanner = null;

  await req.user.save();

  res.status(204).send();
});

export const getChildSkills = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  res
    .status(200)
    .json({ skills: child.skills, permissions: child.permissions });
});

export const addChildSkill = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["name"]);
  const logType = getLogType(role, "ADDED_SKILL");
  const permissionKey = "canAddSkills";

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Added skill: ${validatedData.name}`
  );

  child.skills.push(validatedData);
  await req.user.save();

  res.status(201).json({
    message: "Skill added successfully.",
    skills: child.skills,
    permissions: child.permissions,
  });
});

export const updateChildSkill = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["name"]);
  const logType = getLogType(role, "UPDATED_SKILL");
  const permissionKey = "canUpdateSkills";

  const skill = child.skills.id(req.params.skillId);
  if (!skill) throw new ApiError("Child skill not found.", 404);

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Updated skill ID ${req.params.skillId} to ${validatedData.name}`
  );

  Object.assign(skill, validatedData);
  await req.user.save();

  res.status(200).json({ skill, permissions: child.permissions });
});

export const deleteChildSkill = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const permissionKey = "canDeleteSkills";

  const skill = child.skills.id(req.params.skillId);
  if (!skill) throw new ApiError("Child skill not found.", 404);
  const logType = getLogType(role, "DELETED_SKILL");
  const skillName = skill.name;

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Deleted skill: ${skillName}`
  );

  await skill.deleteOne();
  await req.user.save();

  res.status(204).send();
});

export const getChildInterests = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  res
    .status(200)
    .json({ interests: child.interests, permissions: child.permissions });
});

export const addChildInterest = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["name"]);
  const logType = getLogType(role, "ADDED_INTEREST");
  const permissionKey = "canAddInterests";

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Added interest: ${validatedData.name}`
  );

  child.interests.push(validatedData);
  await req.user.save();

  res.status(201).json({
    message: "Interest added successfully.",
    interests: child.interests,
    permissions: child.permissions,
  });
});

export const updateChildInterest = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["name"]);
  const logType = getLogType(role, "UPDATED_INTEREST");
  const permissionKey = "canUpdateInterests";

  const interest = child.interests.id(req.params.interestId);
  if (!interest) throw new ApiError("Child interest not found.", 404);

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Updated interest ID ${req.params.interestId} to ${validatedData.name}`
  );

  Object.assign(interest, validatedData);
  await req.user.save();

  res.status(200).json({ interest, permissions: child.permissions });
});

export const deleteChildInterest = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const permissionKey = "canDeleteInterests";

  const interest = child.interests.id(req.params.interestId);
  if (!interest) throw new ApiError("Child interest not found.", 404);
  const logType = getLogType(role, "DELETED_INTEREST");
  const interestName = interest.name;

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Deleted interest: ${interestName}`
  );

  await interest.deleteOne();
  await req.user.save();

  res.status(204).send();
});

export const getChildCertifications = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  res.status(200).json({
    certifications: child.certifications,
    permissions: child.permissions,
  });
});

export const addChildCertification = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["title", "issuer"]);
  const logType = getLogType(role, "ADDED_CERTIFICATION");
  const permissionKey = "canAddCertifications";

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Added certification: ${validatedData.title}`
  );

  child.certifications.push(validatedData);
  await req.user.save();

  res.status(201).json({
    message: "Certification added successfully.",
    certifications: child.certifications,
    permissions: child.permissions,
  });
});

export const updateChildCertification = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["title", "issuer"]);
  const logType = getLogType(role, "UPDATED_CERTIFICATION");
  const permissionKey = "canUpdateCertifications";

  const certification = child.certifications.id(req.params.certId);
  if (!certification) throw new ApiError("Child certification not found.", 404);

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Updated certification ID ${req.params.certId} to ${validatedData.title}`
  );

  Object.assign(certification, validatedData);
  await req.user.save();

  res.status(200).json({ certification, permissions: child.permissions });
});

export const deleteChildCertification = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const permissionKey = "canDeleteCertifications";

  const certification = child.certifications.id(req.params.certId);
  if (!certification) throw new ApiError("Child certification not found.", 404);
  const logType = getLogType(role, "DELETED_CERTIFICATION");
  const certTitle = certification.title;

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Deleted certification: ${certTitle}`
  );

  await certification.deleteOne();
  await req.user.save();

  res.status(204).send();
});

export const getChildAchievements = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  res
    .status(200)
    .json({ achievements: child.achievements, permissions: child.permissions });
});

export const addChildAchievement = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["title", "description"]);
  const logType = getLogType(role, "ADDED_ACHIEVEMENT");
  const permissionKey = "canAddAchievements";

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Added achievement: ${validatedData.title}`
  );

  child.achievements.push(validatedData);
  await req.user.save();

  res.status(201).json({
    message: "Achievement added successfully.",
    achievements: child.achievements,
    permissions: child.permissions,
  });
});

export const updateChildAchievement = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["title", "description"]);
  const logType = getLogType(role, "UPDATED_ACHIEVEMENT");
  const permissionKey = "canUpdateAchievements";

  const achievement = child.achievements.id(req.params.achId);
  if (!achievement) throw new ApiError("Child achievement not found.", 404);

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Updated achievement ID ${req.params.achId} to ${validatedData.title}`
  );

  Object.assign(achievement, validatedData);
  await req.user.save();

  res.status(200).json({ achievement, permissions: child.permissions });
});

export const deleteChildAchievement = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const permissionKey = "canDeleteAchievements";

  const achievement = child.achievements.id(req.params.achId);
  if (!achievement) throw new ApiError("Child achievement not found.", 404);
  const logType = getLogType(role, "DELETED_ACHIEVEMENT");
  const achTitle = achievement.title;

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Deleted achievement: ${achTitle}`
  );

  await achievement.deleteOne();
  await req.user.save();

  res.status(204).send();
});

export const getChildProjects = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  res
    .status(200)
    .json({ projects: child.projects, permissions: child.permissions });
});

export const addChildProject = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["title", "description"]);
  const logType = getLogType(role, "ADDED_PROJECT");
  const permissionKey = "canAddProjects";

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Added project: ${validatedData.title}`
  );

  child.projects.push(validatedData);
  await req.user.save();

  res.status(201).json({
    message: "Project added successfully.",
    projects: child.projects,
    permissions: child.permissions,
  });
});

export const updateChildProject = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["title", "description"]);
  const logType = getLogType(role, "UPDATED_PROJECT");
  const permissionKey = "canUpdateProjects";

  const project = child.projects.id(req.params.projectId);
  if (!project) throw new ApiError("Child project not found.", 404);

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Updated project ID ${req.params.projectId} to ${validatedData.title}`
  );

  Object.assign(project, validatedData);
  await req.user.save();

  res.status(200).json({ project, permissions: child.permissions });
});

export const deleteChildProject = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const permissionKey = "canDeleteProjects";

  const project = child.projects.id(req.params.projectId);
  if (!project) throw new ApiError("Child project not found.", 404);
  const logType = getLogType(role, "DELETED_PROJECT");
  const projectTitle = project.title;

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Deleted project: ${projectTitle}`
  );

  await project.deleteOne();
  await req.user.save();

  res.status(204).send();
});

export const getChildEducations = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  res
    .status(200)
    .json({ educations: child.educations, permissions: child.permissions });
});

export const addChildEducation = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["school", "degree"]);
  const logType = getLogType(role, "ADDED_EDUCATION");
  const permissionKey = "canAddEducations";

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Added education: ${validatedData.degree} at ${validatedData.school}`
  );

  child.educations.push(validatedData);
  await req.user.save();

  res.status(201).json({
    message: "Education added successfully.",
    educations: child.educations,
    permissions: child.permissions,
  });
});

export const updateChildEducation = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const validatedData = validateInput(req.body, ["school", "degree"]);
  const logType = getLogType(role, "UPDATED_EDUCATION");
  const permissionKey = "canUpdateEducations";

  const education = child.educations.id(req.params.educationId);
  if (!education) throw new ApiError("Child education not found.", 404);

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Updated education ID ${req.params.educationId} to ${validatedData.degree}`
  );

  Object.assign(education, validatedData);
  await req.user.save();

  res.status(200).json({ education, permissions: child.permissions });
});

export const deleteChildEducation = asyncHandler(async (req, res) => {
  const child = findChild(req.user, req.params.childId);
  const role = req.user.role;
  const permissionKey = "canDeleteEducations";

  const education = child.educations.id(req.params.educationId);
  if (!education) throw new ApiError("Child education not found.", 404);
  const logType = getLogType(role, "DELETED_EDUCATION");
  const eduSchool = education.school;

  await enforcePermissionAndLog(
    req,
    child,
    permissionKey,
    logType,
    `Deleted education from: ${eduSchool}`
  );

  await education.deleteOne();
  await req.user.save();

  res.status(204).send();
});
