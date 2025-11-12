import express from "express";
import { protectChild } from "../middlewares/auth.middleware.js";
import {
  generateTrivia,
  generateCodeDetective,
  generateMathChallenge,
  generateStoryAdventure,
  generateWordMaster,
  submitTriviaAnswers,
  submitStoryChoice,
  submitWordMasterAnswers,
  submitMathAnswers,
  submitCodeDetectiveAnswers,
  getGameReport,
} from "../controllers/aigames.controller.js";

const router = express.Router();

router.post("/trivia", protectChild, generateTrivia);
router.post("/story-adventure", protectChild, generateStoryAdventure);
router.post("/word-master", protectChild, generateWordMaster);
router.post("/math-challenge", protectChild, generateMathChallenge);
router.post("/code-detective", protectChild, generateCodeDetective);

router.post("/:childId/trivia/submit", protectChild, submitTriviaAnswers);
router.post(
  "/:childId/story-adventure/submit",
  protectChild,
  submitStoryChoice
);
router.post(
  "/:childId/word-master/submit",
  protectChild,
  submitWordMasterAnswers
);
router.post("/:childId/math-challenge/submit", protectChild, submitMathAnswers);
router.post(
  "/:childId/code-detective/submit",
  protectChild,
  submitCodeDetectiveAnswers
);

router.get("/report/:sessionId", protectChild, getGameReport);

export default router;
