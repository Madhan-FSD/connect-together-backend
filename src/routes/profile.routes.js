import express from "express";
import { User } from "../models/user.model.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getMyCoreProfile,
  getUserAvatar,
  getUserProfileBanner,
  getMyProjects,
  getMyCertifications,
  getMyEducation,
  getMyExperiences,
  getMyInterests,
  getMySkills,
  getMyAchievements,
  addEducation,
  addExperience,
  addInterest,
  addSkill,
  addProject,
  addCertification,
  addAchievement,
  updateCertification,
  updateEducation,
  updateExperience,
  updateInterest,
  updateMyCoreProfile,
  updateSkill,
  updateAchievement,
  updateProject,
  updateUserAvatar,
  updateUserProfileBanner,
  deleteCertification,
  deleteEducation,
  deleteExperience,
  deleteInterest,
  deleteSkill,
  deleteAchievement,
  deleteProject,
  deleteUserAvatar,
  deleteUserProfileBanner,
  getFullProfileForUser,
  getMyAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getUserFullProfileById,
} from "../controllers/user/profile.controller.js";

import upload from "../middlewares/multer.middleware.js";

const loadUser = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res
        .status(401)
        .json({ error: "Authentication required to load user data." });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    if (!user.role) {
      user.role = "NORMAL_USER";
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error loading user profile:", error.message);
    res
      .status(500)
      .json({ error: "Internal server error during user lookup." });
  }
};

const router = express.Router();

router.use("/", protect, loadUser);

router
  .route("/")
  .get(getMyCoreProfile)
  .put(
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "profileBanner", maxCount: 1 },
    ]),
    updateMyCoreProfile
  );

router.route("/addresses").get(getMyAddresses).post(addAddress);
router.route("/addresses/:addressId").put(updateAddress).delete(deleteAddress);

router.route("/skills").get(getMySkills).post(addSkill);
router.route("/skills/:skillId").put(updateSkill).delete(deleteSkill);

router.route("/interests").get(getMyInterests).post(addInterest);
router
  .route("/interests/:interestId")
  .put(updateInterest)
  .delete(deleteInterest);

router.route("/certifications").get(getMyCertifications).post(addCertification);
router
  .route("/certifications/:certId")
  .put(updateCertification)
  .delete(deleteCertification);

router.route("/experiences").get(getMyExperiences).post(addExperience);
router
  .route("/experiences/:experienceId")
  .put(updateExperience)
  .delete(deleteExperience);

router.route("/educations").get(getMyEducation).post(addEducation);
router
  .route("/educations/:educationId")
  .put(updateEducation)
  .delete(deleteEducation);

router.route("/achievements").get(getMyAchievements).post(addAchievement);
router
  .route("/achievements/:achId")
  .put(updateAchievement)
  .delete(deleteAchievement);

router.route("/projects").get(getMyProjects).post(addProject);
router.route("/projects/:projectId").put(updateProject).delete(deleteProject);

router
  .route("/avatar")
  .get(protect, getUserAvatar)
  .put(protect, upload.single("avatar"), updateUserAvatar)
  .delete(protect, deleteUserAvatar);

router
  .route("/banner")
  .get(protect, getUserProfileBanner)
  .put(protect, upload.single("profileBanner"), updateUserProfileBanner)
  .delete(protect, deleteUserProfileBanner);

router.get("/full-profile", getFullProfileForUser);

router.get("/:userId", getUserFullProfileById);

export default router;
