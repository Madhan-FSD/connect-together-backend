const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../../middleware/auth");
const AdminInstitutions = require("../../controllers/admin/institutions/institutions");
const Users = require("../../controllers/users/users-list");
const Businnes = require("../../controllers/admin/business/addorUpdateBusiness");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/institution/create",
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

router.post(
  "/institutions/enquire",
  isAuthenticated,
  AdminInstitutions.enquireInstitution,
);
router.get(
  "/admin/enquiries",
  isAuthenticated,
  isAdmin,
  AdminInstitutions.listEnquiries,
);
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
