const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../../middleware/auth");
const AdminInstitutions = require("../../controllers/admin/institutions/institutions");
const AdminCourses = require("../../controllers/admin/courses/courses");
const Users = require("../../controllers/users/users-list");

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

module.exports = router;
