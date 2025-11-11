import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { validateInput } from "../../utils/validator.js";
import { logUserActivity } from "../../utils/logUserActivity.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../../utils/cloudinary.js";
import { calculateAge } from "../../utils/child.utils.js";

const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split("/");
  const uploadIndex = parts.indexOf("upload");

  if (uploadIndex === -1 || uploadIndex + 1 >= parts.length) return null;

  const resourcePath = parts.slice(uploadIndex + 2).join("/");

  const publicIdWithExt = resourcePath;
  const publicId = publicIdWithExt.split(".").slice(0, -1).join(".");

  return publicId;
};

export const getFullProfileForUser = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const {
    _id,
    email,
    role,
    parentId,
    firstName,
    lastName,
    dob,
    gender,
    addresses,
    mobile,
    avatar,
    profileBanner,
    profileHeadline,
    about,
    skills,
    certifications,
    experiences,
    educations,
    interests,
    achievements,
    projects,
    featuredContent,
    children,
    createdAt,
  } = user;

  const age = calculateAge(user.dob);

  res.status(200).json({
    _id,
    email,
    role,
    parentId,
    firstName,
    lastName,
    dob,
    gender,
    age,
    addresses,
    mobile,
    avatar,
    profileBanner,
    profileHeadline,
    about,
    skills,
    certifications,
    experiences,
    educations,
    interests,
    achievements,
    projects,
    featuredContent,
    children: children.map((child) => ({
      _id: child._id,
      name: child.name,
      age: child.age,
      avatar: child.avatar,
      profileBanner: child.profileBanner,
    })),
    createdAt,
  });
});

export const getMyCoreProfile = asyncHandler(async (req, res) => {
  const user = req.user;

  res.status(200).json({
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    dob: user.dob || null,
    gender: user.gender || null,
    age: calculateAge(user.dob) || null,
    addresses: user.addresses || [],
    profileHeadline: user.profileHeadline || null,
    about: user.about || null,
    mobile: user.mobile
      ? {
          countryCode: user.mobile.countryCode || "",
          phoneNumber: user.mobile.phoneNumber || "",
        }
      : { countryCode: "", phoneNumber: "" },
    avatar: user.avatar
      ? {
          url: user.avatar.url || null,
          public_id: user.avatar.public_id || null,
        }
      : null,
    profileBanner: user.profileBanner
      ? {
          url: user.profileBanner.url || null,
          public_id: user.profileBanner.public_id || null,
        }
      : null,
  });
});

export const updateMyCoreProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const validatedBody = validateInput(req.body);
  const uploadedFiles = req.files;

  const CLOUDINARY_BASE_PATH = `users/${user._id}`;

  let changesMade = false;
  let activityMessage = "YOU updated your core profile details.";

  if (uploadedFiles && uploadedFiles.avatar && uploadedFiles.avatar[0]) {
    const avatarLocalPath = uploadedFiles.avatar[0].path;
    const oldAvatarUrl = user.avatar?.url;

    const avatarFolderPath = `${CLOUDINARY_BASE_PATH}/avatars`;
    const uploadResult = await uploadOnCloudinary(
      avatarLocalPath,
      avatarFolderPath
    );

    if (uploadResult) {
      user.avatar = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
      changesMade = true;
      activityMessage += " (Avatar changed)";

      if (oldAvatarUrl) {
        const publicId =
          user.avatar?.public_id || extractPublicIdFromUrl(oldAvatarUrl);
        if (publicId) {
          deleteFromCloudinary(publicId).catch((err) => console.error(err));
        }
      }
    } else {
      throw new ApiError("Failed to upload avatar to external service.", 500);
    }
  } else if (validatedBody.avatar !== undefined) {
    user.avatar = validatedBody.avatar;
    changesMade = true;
  }

  if (
    uploadedFiles &&
    uploadedFiles.profileBanner &&
    uploadedFiles.profileBanner[0]
  ) {
    const bannerLocalPath = uploadedFiles.profileBanner[0].path;
    const oldBannerUrl = user.profileBanner?.url;

    const bannerFolderPath = `${CLOUDINARY_BASE_PATH}/banners`;
    const uploadResult = await uploadOnCloudinary(
      bannerLocalPath,
      bannerFolderPath
    );

    if (uploadResult) {
      user.profileBanner = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
      changesMade = true;
      activityMessage += " (Banner changed)";

      if (oldBannerUrl) {
        const publicId =
          user.profileBanner?.public_id || extractPublicIdFromUrl(oldBannerUrl);
        if (publicId) {
          deleteFromCloudinary(publicId).catch((err) => console.error(err));
        }
      }
    } else {
      throw new ApiError(
        "Failed to upload profile banner to external service.",
        500
      );
    }
  } else if (validatedBody.profileBanner !== undefined) {
    user.profileBanner = validatedBody.profileBanner;
    changesMade = true;
  }

  if (validatedBody.profileHeadline !== undefined) {
    user.profileHeadline = validatedBody.profileHeadline;
    changesMade = true;
  }
  if (validatedBody.about !== undefined) {
    user.about = validatedBody.about;
    changesMade = true;
  }
  if (validatedBody.firstName !== undefined) {
    user.firstName = validatedBody.firstName;
    changesMade = true;
  }
  if (validatedBody.lastName !== undefined) {
    user.lastName = validatedBody.lastName;
    changesMade = true;
  }
  if (validatedBody.dob !== undefined) {
    user.dob = new Date(validatedBody.dob);
    changesMade = true;
  }
  if (validatedBody.gender !== undefined) {
    user.gender = validatedBody.gender;
    changesMade = true;
  }

  if (validatedBody.mobile !== undefined) {
    if (!user.mobile) user.mobile = {};
    if (validatedBody.mobile.countryCode !== undefined) {
      user.mobile.countryCode = validatedBody.mobile.countryCode;
      changesMade = true;
    }
    if (validatedBody.mobile.phoneNumber !== undefined) {
      user.mobile.phoneNumber = validatedBody.mobile.phoneNumber;
      changesMade = true;
    }
  }

  if (!changesMade) {
    throw new ApiError("No fields or files provided for update.", 400);
  }

  await user.save();

  logUserActivity("USER_ACTIVITY", user._id, activityMessage);

  res.status(200).json({
    firstName: user.firstName,
    lastName: user.lastName,
    dob: user.dob,
    gender: user.gender,
    mobile: user.mobile,
    avatar: user.avatar,
    profileBanner: user.profileBanner,
    profileHeadline: user.profileHeadline,
    about: user.about,
  });
});

export const getMyAddresses = asyncHandler(async (req, res) => {
  res.status(200).json({ addresses: req.user.addresses });
});

export const addAddress = asyncHandler(async (req, res) => {
  const validatedBody = validateInput(req.body, [
    "street",
    "city",
    "state",
    "zipCode",
  ]);

  req.user.addresses.push(validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU added a new address in ${validatedBody.city}.`
  );
  res.status(201).json({ addresses: req.user.addresses });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError("Address not found.", 404);

  const validatedBody = validateInput(req.body);
  if (Object.keys(validatedBody).length === 0) {
    throw new ApiError("No data provided for update.", 400);
  }

  Object.assign(address, validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU updated address ID: ${req.params.addressId}.`
  );
  res.status(200).json({ address });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.addressId);
  if (!address) throw new ApiError("Address not found.", 404);
  const addressCity = address.city;
  await address.deleteOne();
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU deleted address in ${addressCity}.`
  );
  res.status(204).send();
});

export const getMySkills = asyncHandler(async (req, res) => {
  res.status(200).json({ skills: req.user.skills });
});

export const addSkill = asyncHandler(async (req, res) => {
  const validatedBody = validateInput(req.body, ["name"]);

  req.user.skills.push(validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU added a new skill: ${validatedBody.name}.`
  );
  res.status(201).json({ skills: req.user.skills });
});

export const updateSkill = asyncHandler(async (req, res) => {
  const skill = req.user.skills.id(req.params.skillId);
  if (!skill) throw new ApiError("Skill not found.", 404);

  const validatedBody = validateInput(req.body);
  if (Object.keys(validatedBody).length === 0) {
    throw new ApiError("No data provided for update.", 400);
  }

  Object.assign(skill, validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU updated skill: ${skill.name}.`
  );
  res.status(200).json({ skill });
});

export const deleteSkill = asyncHandler(async (req, res) => {
  const skill = req.user.skills.id(req.params.skillId);
  if (!skill) throw new ApiError("Skill not found.", 404);
  const skillName = skill.name;
  await skill.deleteOne();
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU deleted skill: ${skillName}.`
  );
  res.status(204).send();
});

export const getMyInterests = asyncHandler(async (req, res) => {
  res.status(200).json({ interests: req.user.interests });
});

export const addInterest = asyncHandler(async (req, res) => {
  const validatedBody = validateInput(req.body, ["name"]);

  req.user.interests.push(validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU added a new interest: ${validatedBody.name}.`
  );
  res.status(201).json({ interests: req.user.interests });
});

export const updateInterest = asyncHandler(async (req, res) => {
  const interest = req.user.interests.id(req.params.interestId);
  if (!interest) throw new ApiError("Interest not found.", 404);

  const validatedBody = validateInput(req.body);
  if (Object.keys(validatedBody).length === 0) {
    throw new ApiError("No data provided for update.", 400);
  }

  Object.assign(interest, validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU updated interest: ${interest.name}.`
  );
  res.status(200).json({ interest });
});

export const deleteInterest = asyncHandler(async (req, res) => {
  const interest = req.user.interests.id(req.params.interestId);
  if (!interest) throw new ApiError("Interest not found.", 404);
  const interestName = interest.name;
  await interest.deleteOne();
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU deleted interest: ${interestName}.`
  );
  res.status(204).send();
});

export const getMyCertifications = asyncHandler(async (req, res) => {
  res.status(200).json({ certifications: req.user.certifications });
});

export const addCertification = asyncHandler(async (req, res) => {
  const validatedBody = validateInput(req.body, ["name"]);

  req.user.certifications.push(validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU added new certification: ${validatedBody.name}.`
  );
  res.status(201).json({ certifications: req.user.certifications });
});

export const updateCertification = asyncHandler(async (req, res) => {
  const cert = req.user.certifications.id(req.params.certId);
  if (!cert) throw new ApiError("Certification not found.", 404);

  const validatedBody = validateInput(req.body);
  if (Object.keys(validatedBody).length === 0) {
    throw new ApiError("No data provided for update.", 400);
  }

  Object.assign(cert, validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU updated certification: ${cert.name}.`
  );
  res.status(200).json({ cert });
});

export const deleteCertification = asyncHandler(async (req, res) => {
  const cert = req.user.certifications.id(req.params.certId);
  if (!cert) throw new ApiError("Certification not found.", 404);
  const certName = cert.name;
  await cert.deleteOne();
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU deleted certification: ${certName}.`
  );
  res.status(204).send();
});

export const getMyExperiences = asyncHandler(async (req, res) => {
  res.status(200).json({ experiences: req.user.experiences });
});

export const addExperience = asyncHandler(async (req, res) => {
  const validatedBody = validateInput(req.body, ["title"]);

  req.user.experiences.push(validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU added new experience: ${validatedBody.name}.`
  );
  res.status(201).json({ experiences: req.user.experiences });
});

export const updateExperience = asyncHandler(async (req, res) => {
  const exp = req.user.experiences.id(req.params.experienceId);
  if (!exp) throw new ApiError("Experience not found.", 404);

  const validatedBody = validateInput(req.body);
  if (Object.keys(validatedBody).length === 0) {
    throw new ApiError("No data provided for update.", 400);
  }

  Object.assign(exp, validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU updated experience: ${exp.name}.`
  );
  res.status(200).json({ experience: exp });
});

export const deleteExperience = asyncHandler(async (req, res) => {
  const exp = req.user.experiences.id(req.params.experienceId);
  if (!exp) throw new ApiError("Experience not found.", 404);
  const expName = exp.name;
  await exp.deleteOne();
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU deleted experience: ${expName}.`
  );
  res.status(204).send();
});

export const getMyEducation = asyncHandler(async (req, res) => {
  res.status(200).json({ educations: req.user.educations });
});

export const addEducation = asyncHandler(async (req, res) => {
  const validatedBody = validateInput(req.body, ["degree"]);

  req.user.educations.push(validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU added new education entry: ${validatedBody.degree}.`
  );
  res.status(201).json({ educations: req.user.educations });
});

export const updateEducation = asyncHandler(async (req, res) => {
  const edu = req.user.educations.id(req.params.educationId);
  if (!edu) throw new ApiError("Education entry not found.", 404);

  const validatedBody = validateInput(req.body);
  if (Object.keys(validatedBody).length === 0) {
    throw new ApiError("No data provided for update.", 400);
  }

  Object.assign(edu, validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU updated education entry: ${edu.degree}.`
  );
  res.status(200).json({ education: edu });
});

export const deleteEducation = asyncHandler(async (req, res) => {
  const edu = req.user.educations.id(req.params.educationId);
  if (!edu) throw new ApiError("Education entry not found.", 404);
  const eduName = edu.degree;
  await edu.deleteOne();
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU deleted education entry: ${eduName}.`
  );
  res.status(204).send();
});

export const getMyAchievements = asyncHandler(async (req, res) => {
  res.status(200).json({ achievements: req.user.achievements });
});

export const addAchievement = asyncHandler(async (req, res) => {
  const validatedBody = validateInput(req.body, ["name"]);

  req.user.achievements.push(validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU added new achievement: ${validatedBody.name}.`
  );
  res.status(201).json({ achievements: req.user.achievements });
});

export const updateAchievement = asyncHandler(async (req, res) => {
  const ach = req.user.achievements.id(req.params.achId);
  if (!ach) throw new ApiError("Achievement not found.", 404);

  const validatedBody = validateInput(req.body);
  if (Object.keys(validatedBody).length === 0) {
    throw new ApiError("No data provided for update.", 400);
  }

  Object.assign(ach, validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU updated achievement: ${ach.name}.`
  );
  res.status(200).json({ achievement: ach });
});

export const deleteAchievement = asyncHandler(async (req, res) => {
  const ach = req.user.achievements.id(req.params.achId);
  if (!ach) throw new ApiError("Achievement not found.", 404);
  const achName = ach.name;
  await ach.deleteOne();
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU deleted achievement: ${achName}.`
  );
  res.status(204).send();
});

export const getMyProjects = asyncHandler(async (req, res) => {
  res.status(200).json({ projects: req.user.projects });
});

export const addProject = asyncHandler(async (req, res) => {
  const validatedBody = validateInput(req.body, ["name"]);

  req.user.projects.push(validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU added new project: ${validatedBody.name}.`
  );
  res.status(201).json({ projects: req.user.projects });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = req.user.projects.id(req.params.projectId);
  if (!project) throw new ApiError("Project not found.", 404);

  const validatedBody = validateInput(req.body);
  if (Object.keys(validatedBody).length === 0) {
    throw new ApiError("No data provided for update.", 400);
  }

  Object.assign(project, validatedBody);
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU updated project: ${project.name}.`
  );
  res.status(200).json({ project: project });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = req.user.projects.id(req.params.projectId);
  if (!project) throw new ApiError("Project not found.", 404);
  const projectName = project.name;
  await project.deleteOne();
  await req.user.save();
  logUserActivity(
    "USER_ACTIVITY",
    req.user._id,
    `YOU deleted project: ${projectName}.`
  );
  res.status(204).send();
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
  const user = req.user;
  const avatarFile = req.file;
  if (!avatarFile)
    return res.status(400).json({ message: "Avatar file is required." });

  if (user.avatar?.public_id) await deleteFromCloudinary(user.avatar.public_id);

  const uploadedAvatar = await uploadOnCloudinary(
    avatarFile.path,
    `users/${user._id}/avatars`
  );

  user.avatar = {
    url: uploadedAvatar.secure_url,
    public_id: uploadedAvatar.public_id,
  };

  await user.save();
  res.status(200).json({ avatar: user.avatar });
});

export const deleteUserAvatar = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user.avatar?.public_id)
    return res.status(400).json({ message: "No avatar found to delete." });

  await deleteFromCloudinary(user.avatar.public_id);
  user.avatar = null;
  await user.save();

  res.status(200).json({ message: "Avatar deleted successfully." });
});

export const updateUserProfileBanner = asyncHandler(async (req, res) => {
  const user = req.user;
  const bannerFile = req.file;
  if (!bannerFile)
    return res
      .status(400)
      .json({ message: "Profile banner file is required." });

  if (user.profileBanner?.public_id)
    await deleteFromCloudinary(user.profileBanner.public_id);

  const uploadedBanner = await uploadOnCloudinary(
    bannerFile.path,
    `users/${user._id}/banners`
  );

  user.profileBanner = {
    url: uploadedBanner.secure_url,
    public_id: uploadedBanner.public_id,
  };

  await user.save();
  res.status(200).json({ profileBanner: user.profileBanner });
});

export const deleteUserProfileBanner = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user.profileBanner?.public_id)
    return res
      .status(400)
      .json({ message: "No profile banner found to delete." });

  await deleteFromCloudinary(user.profileBanner.public_id);
  user.profileBanner = null;
  await user.save();

  res.status(200).json({ message: "Profile banner deleted successfully." });
});

export const getUserAvatar = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user.avatar)
    return res.status(404).json({ message: "No avatar found." });

  res.status(200).json({ avatar: user.avatar });
});

export const getUserProfileBanner = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user.profileBanner)
    return res.status(404).json({ message: "No profile banner found." });

  res.status(200).json({ profileBanner: user.profileBanner });
});
