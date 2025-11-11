import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";
import {
  createPost,
  getPosts,
  getPostDetails,
  updatePost,
  deletePost,
  addComment,
  deleteComment,
  getComments,
} from "../controllers/post.controller.js";

const router = express.Router();

router.use(protect);

router.post("/profile", upload.single("media"), createPost);
router.post("/channel", upload.single("media"), createPost);

router.get("/feed/:targetId", getPosts);
router.route("/:postId").get(getPostDetails).put(updatePost).delete(deletePost);

router.post("/:postId/comments", addComment);
router.get("/:postId/comments", getComments);
router.delete("/comments/:commentId", deleteComment);

export default router;
