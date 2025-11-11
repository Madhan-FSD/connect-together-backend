const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../../middleware/auth");
const AdminInstitutions = require("../../controllers/admin/institutions/institutions");
const AdminCourses = require("../../controllers/admin/courses/courses");
const Users = require("../../controllers/users/users-list");
const Businnes = require("../../controllers/admin/business/addorUpdateBusiness");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/institutions",
  isAuthenticated,
  isAdmin,
  AdminInstitutions.createInstitution,
);
router.get(
  "/institutions",
  isAuthenticated,
  isAdmin,
  AdminInstitutions.listInstitutions,
);

router.post("/courses", isAuthenticated, isAdmin, AdminCourses.createCourse);

router.get("/users-list", isAuthenticated, isAdmin, Users.userList);
router.post(
  "/add-businnes-details",
  isAuthenticated,
  isAdmin,
  upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "businessBanner", maxCount: 1 },
  ]),
  Businnes.addOrUpdateBusiness,
);
router.get("/business-data", isAuthenticated, isAdmin, Businnes.getBusiness);

module.exports = router;
