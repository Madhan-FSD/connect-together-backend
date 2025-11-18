const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../../middleware/auth");
const AdminInstitutions = require("../../controllers/admin/institutions/institutions");
const Users = require("../../controllers/users/users-list");
const Businnes = require("../../controllers/admin/business/addorUpdateBusiness");
const CompanyInfo = require("../../controllers/admin/companyInformation/companyInformation");
const Branch = require("../../controllers/admin/branch/createBramch");
const Staff = require("../../controllers/admin/staff/createStaff");
const courseCtrl = require("../../controllers/admin/course/course");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/institution/create",
  isAuthenticated,

  AdminInstitutions.createInstitution,
);
router.get(
  "/institutions",
  isAuthenticated,

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

  AdminInstitutions.listEnquiries,
);
router.put(
  "/enquiries/update-status",
  isAuthenticated,

  AdminInstitutions.updateEnquiryStatus,
);
router.get("/users-list", isAuthenticated, Users.userList);

router.post(
  "/create-company-information",
  upload.none(),
  isAuthenticated,
  CompanyInfo.addCompanyInformation,
);
router.get(
  "/company-information-profile/:id",
  isAuthenticated,
  CompanyInfo.companyInformationProfile,
);
router.put(
  "/update-company-information/:id",
  isAuthenticated,
  CompanyInfo.updateCompanyInformation,
);

router.post(
  "/create-branch",
  isAuthenticated,
  upload.single("branchLogo"),
  Branch.createBranch,
);
router.get("/branch/all", isAuthenticated, Branch.getAllBranches);
router.get("/branch/:branchId", isAuthenticated, Branch.getSingleBranch);
router.put(
  "/branch/update/:branchId",
  isAuthenticated,
  upload.single("branchLogo"),
  Branch.updateBranch,
);
router.delete(
  "/branch/delete/:branchId",
  isAuthenticated,
  Branch.softDeleteBranch,
);
router.post(
  "/create-business",
  isAuthenticated,
  upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "businessBanner", maxCount: 1 },
  ]),
  Businnes.createBusiness,
);
router.get("/business-profile", isAuthenticated, Businnes.getBusinessProfile);
router.get(
  "/business-profile/:businessId",
  isAuthenticated,
  Businnes.getBusinessProfile,
);
router.put(
  "/update-business/:businessId",
  isAuthenticated,
  upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "businessBanner", maxCount: 1 },
  ]),
  Businnes.editBusiness,
);
router.delete(
  "/business/:businessId",
  isAuthenticated,
  Businnes.softDeleteBusiness,
);

router.post("/create-staff", isAuthenticated, Staff.createStaff);
router.put("/update-staff/:staffId", isAuthenticated, Staff.updateStaff);
router.get(
  "/get-staff-profile-for-branch/:branchId",
  isAuthenticated,
  Staff.getStaffList,
);
router.delete(
  "/staff-profile-deleted/:staffId",
  isAuthenticated,
  Staff.deleteStaff,
);
router.get("/staff-profile/:staffId", isAuthenticated, Staff.getStaffProfile);

router.post(
  "/create-course",
  isAuthenticated,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  courseCtrl.createCourse,
);
router.get("/course-list", isAuthenticated, courseCtrl.getCourses);

module.exports = router;
