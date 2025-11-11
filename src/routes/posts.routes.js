import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";
import {
  createPost,
  getPosts,
  getPostDetails,
  updatePost,
  deletePost,
  toggleLike,
} from "../controllers/post.controller.js";

const router = express.Router();

router.use(protect);

router.post("/profile", upload.single("media"), createPost);
router.post("/channel", upload.single("media"), createPost);

router.get("/feed/:targetId", getPosts);

router.route("/:postId").get(getPostDetails).put(updatePost).delete(deletePost);

router.post("/:postId/like", toggleLike);

export default router;
