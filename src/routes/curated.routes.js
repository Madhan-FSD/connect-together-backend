import express from "express";
import { getCuratedByHandle } from "../controllers/curated.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/handle/:handle", optionalAuth, getCuratedByHandle);

export default router;
