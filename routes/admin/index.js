const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../../middleware/auth");
const AdminInstitutions = require("../../controllers/admin/institutions/institutions");
const Users = require("../../controllers/users/users-list");
const Businnes = require("../../controllers/admin/business/addorUpdateBusiness");
const CompanyInfo = require("../../controllers/admin/companyInformation/companyInformation");
const Branch = require("../../controllers/admin/branch/createBramch");
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
router.put(
  "/enquiries/update-status",
  isAuthenticated,
  isAdmin,
  AdminInstitutions.updateEnquiryStatus,
);
router.get("/users-list", isAuthenticated, isAdmin, Users.userList);

router.post(
  "/create-company-information",
  isAuthenticated,
  isAdmin,
  upload.single("companyLogo"),
  CompanyInfo.addCompanyInformation,
);
router.get(
  "/company-information-profile/:id",
  isAuthenticated,
  isAdmin,
  CompanyInfo.companyInformationProfile,
);
router.put(
  "/update-company-information/:id",
  isAuthenticated,
  isAdmin,
  upload.single("companyLogo"),
  CompanyInfo.updateCompanyInformation,
);

router.post(
  "/create-branch",
  isAuthenticated,
  isAdmin,
  upload.single("branchLogo"),
  Branch.createBranch,
);
router.get("/branch/all", isAuthenticated, Branch.getAllBranches);
router.get(
  "/branch/:branchId",
  isAuthenticated,
  isAdmin,
  Branch.getSingleBranch,
);

router.put(
  "/branch/update/:branchId",
  isAuthenticated,
  isAdmin,
  upload.single("branchLogo"),
  Branch.updateBranch,
);
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
