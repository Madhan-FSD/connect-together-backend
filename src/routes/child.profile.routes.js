import {
  getChildProjects,
  getChildAvatar,
  getChildProfileBanner,
  getChildCoreProfile,
  getChildCertifications,
  getChildInterests,
  getChildSkills,
  getChildEducations,
  getChildAchievements,
  addChildAchievement,
  addChildCertification,
  addChildInterest,
  addChildSkill,
  addChildProject,
  addChildEducation,
  updateChildCertification,
  updateChildAchievement,
  updateChildCoreProfile,
  updateChildInterest,
  updateChildEducation,
  updateChildSkill,
  updateChildAvatar,
  deleteChildAvatar,
  updateChildProfileBanner,
  deleteChildProfileBanner,
  updateChildProject,
  deleteChildCertification,
  deleteChildInterest,
  deleteChildSkill,
  deleteChildAchievement,
  deleteChildProject,
  deleteChildEducation,
  getFullProfileForChild,
  getChildAddresses,
  addChildAddress,
  updateChildAddress,
  deleteChildAddress,
} from "../controllers/child/profile.controller.js";
import express from "express";
import { User } from "../models/user.model.js";
import { protect, protectChild } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

export const loadUser = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res
        .status(401)
        .json({ error: "Authentication required to load user data." });
    }

    if (req.role === "CHILD") {
      const parent = await User.findOne(
        { "children._id": req.userId },
        { "children.$": 1, firstName: 1, lastName: 1, email: 1 }
      ).lean();

      if (!parent || !parent.children?.length) {
        return res.status(404).json({ error: "Child profile not found." });
      }

      const child = parent.children[0];
      req.user = {
        ...child,
        parentId: parent._id,
        parentFirstName: parent.firstName,
        parentLastName: parent.lastName,
        role: "CHILD",
      };
      req.parent = parent;
      return next();
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

router.use("/", protectChild, loadUser);

router
  .route("/:childId")
  .get(getChildCoreProfile)
  .put(
    upload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "profileBanner", maxCount: 1 },
    ]),
    updateChildCoreProfile
  );

router.get("/:childId/full-profile", getFullProfileForChild);

router
  .route("/:childId/addresses")
  .get(getChildAddresses)
  .post(addChildAddress);

router
  .route("/:childId/addresses/:addressId")
  .put(updateChildAddress)
  .delete(deleteChildAddress);

router.route("/:childId/skills").get(getChildSkills).post(addChildSkill);
router
  .route("/:childId/skills/:skillId")
  .put(updateChildSkill)
  .delete(deleteChildSkill);

router
  .route("/:childId/interests")
  .get(getChildInterests)
  .post(addChildInterest);
router
  .route("/:childId/interests/:interestId")
  .put(updateChildInterest)
  .delete(deleteChildInterest);

router
  .route("/:childId/certifications")
  .get(getChildCertifications)
  .post(addChildCertification);
router
  .route("/:childId/certifications/:certId")
  .put(updateChildCertification)
  .delete(deleteChildCertification);

router
  .route("/:childId/achievements")
  .get(getChildAchievements)
  .post(addChildAchievement);
router
  .route("/:childId/achievements/:achId")
  .put(updateChildAchievement)
  .delete(deleteChildAchievement);

router.route("/:childId/projects").get(getChildProjects).post(addChildProject);
router
  .route("/:childId/projects/:projectId")
  .put(updateChildProject)
  .delete(deleteChildProject);

router
  .route("/:childId/educations")
  .get(getChildEducations)
  .post(addChildEducation);
router
  .route("/:childId/educations/:educationId")
  .put(updateChildEducation)
  .delete(deleteChildEducation);

router
  .route("/:childId/avatar")
  .get(protect, getChildAvatar)
  .put(protect, upload.single("avatar"), updateChildAvatar)
  .delete(protect, deleteChildAvatar);

router
  .route("/:childId/banner")
  .get(protect, getChildProfileBanner)
  .put(protect, upload.single("profileBanner"), updateChildProfileBanner)
  .delete(protect, deleteChildProfileBanner);

export default router;
