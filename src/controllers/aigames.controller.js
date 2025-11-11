import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import GameSession from "../models/gamesession.model.js";
import { updateDailySummaryAndWallet } from "../utils/gameUtils.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const cleanJson = (text) =>
  text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

const processGameSubmission = async (
  childId,
  gameType,
  questionsWithAnswers
) => {
  let score = 0;
  let coinsEarned = 0;
  let maxScore = 0;

  if (Array.isArray(questionsWithAnswers)) {
    maxScore = questionsWithAnswers.length;
    questionsWithAnswers.forEach((q) => {
      if (
        q.userAnswerIndex !== undefined &&
        q.userAnswerIndex === q.correctAnswer
      ) {
        score += 1;
        coinsEarned += 10;
      }
    });
  } else {
    maxScore = 1;
    if (questionsWithAnswers.isCorrect) {
      score = 1;
      coinsEarned = 20;
    }
  }

  const session = await GameSession.create({
    childId: childId,
    gameType: gameType,
    score: score,
    maxScore: maxScore,
    coinsEarned: coinsEarned,
    details: questionsWithAnswers,
  });

  await updateDailySummaryAndWallet(childId, session._id, coinsEarned, score);

  return { score, maxScore, coinsEarned, sessionId: session._id };
};

export const generateTrivia = async (req, res) => {
  try {
    const { topic, difficulty, questionCount } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Generate ${questionCount || 5} ${
      difficulty || "medium"
    } difficulty trivia questions about ${topic || "general knowledge"}.
    Format each question as JSON with: question, options (array of 4), correctAnswer (index 0-3), explanation.
    Return only a JSON array, no markdown formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = cleanJson(response.text());
    const questions = JSON.parse(text);

    res.json({ questions });
  } catch (error) {
    console.error("Error generating trivia:", error);
    res.status(500).json({
      error: "Failed to generate trivia questions.",
      details: error.message,
    });
  }
};

export const submitTriviaAnswers = async (req, res) => {
  try {
    const { childId } = req.params;
    const { questionsWithAnswers } = req.body;

    if (!childId || !questionsWithAnswers) {
      return res.status(400).json({ error: "Missing childId or answers." });
    }

    const result = await processGameSubmission(
      childId,
      "TRIVIA",
      questionsWithAnswers
    );

    res.status(200).json({
      message: "Trivia results submitted successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Error submitting trivia answers:", error);
    res.status(500).json({ error: "Failed to process game submission." });
  }
};

export const generateStoryAdventure = async (req, res) => {
  try {
    const { genre, previousStory, userChoice } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = !previousStory
      ? `Create an engaging interactive ${
          genre || "adventure"
        } story for children.
        Write the opening scene (3-4 sentences) and provide 3 different choices.
        Format as JSON: { story: "text", choices: ["choice1", "choice2", "choice3"] }`
      : `Continue this interactive story:
        Previous story: ${previousStory}
        User chose: ${userChoice}
        Continue for 3-4 sentences and provide 3 new choices.
        Format as JSON: { story: "text", choices: ["choice1", "choice2", "choice3"] }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = cleanJson(response.text());
    const storyData = JSON.parse(text);

    res.json(storyData);
  } catch (error) {
    console.error("Error generating story:", error);
    res.status(500).json({
      error: "Failed to generate story.",
      details: error.message,
    });
  }
};

export const submitStoryChoice = async (req, res) => {
  try {
    const { childId } = req.params;
    const { storySegment, choice, isCorrect } = req.body;

    if (!childId || !storySegment || choice === undefined) {
      return res
        .status(400)
        .json({ error: "Missing childId, story segment, or choice." });
    }

    const gameDetails = { storySegment, choice, isCorrect: isCorrect || false };
    const result = await processGameSubmission(
      childId,
      "STORY_ADVENTURE",
      gameDetails
    );

    res.status(200).json({
      message: "Story choice submitted.",
      ...result,
    });
  } catch (error) {
    console.error("Error submitting story choice:", error);
    res.status(500).json({ error: "Failed to process story submission." });
  }
};

export const generateWordMaster = async (req, res) => {
  try {
    const { gameType, difficulty, category } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    let prompt;
    switch (gameType) {
      case "anagram":
        prompt = `Generate 5 ${
          difficulty || "medium"
        } difficulty anagram puzzles about ${category || "animals"}.
        Format as JSON array: [{ scrambled: "word", answer: "word", hint: "hint" }]`;
        break;
      case "word-association":
        prompt = `Generate a word association game with 1 main word and 8 related words (4 correct, 4 distractors) about ${
          category || "nature"
        }.
        Format as JSON: { mainWord: "word", correctWords: ["w1","w2","w3","w4"], distractors: ["w1","w2","w3","w4"] }`;
        break;
      case "rhyme-time":
        prompt = `Generate 5 words and 3 rhyming options for each (1 correct, 2 wrong) at ${
          difficulty || "medium"
        } difficulty.
        Format as JSON array: [{ word: "word", options: ["opt1", "opt2", "opt3"], correctIndex: 0 }]`;
        break;
      default:
        prompt = `Generate 5 vocabulary challenge words at ${
          difficulty || "medium"
        } difficulty.
        Format as JSON array: [{ word: "word", definition: "definition", usageExample: "example" }]`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = cleanJson(response.text());
    const gameData = JSON.parse(text);

    res.json({ gameType, gameData });
  } catch (error) {
    console.error("Error generating word game:", error);
    res.status(500).json({
      error: "Failed to generate word game.",
      details: error.message,
    });
  }
};

export const submitWordMasterAnswers = async (req, res) => {
  try {
    const { childId } = req.params;
    const { gameType, answers } = req.body;

    if (!childId || !gameType || !answers) {
      return res
        .status(400)
        .json({ error: "Missing childId, gameType, or answers." });
    }

    const gameSessionType = gameType.toUpperCase().replace("-", "_");
    const result = await processGameSubmission(
      childId,
      gameSessionType,
      answers
    );

    res.status(200).json({
      message: `${gameType} results submitted successfully.`,
      ...result,
    });
  } catch (error) {
    console.error("Error submitting word master answers:", error);
    res.status(500).json({ error: "Failed to process game submission." });
  }
};

export const generateMathChallenge = async (req, res) => {
  try {
    const { difficulty, problemCount, topics } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const topicList = topics?.join(", ") || "arithmetic, word problems";

    const prompt = `Generate ${problemCount || 5} ${
      difficulty || "medium"
    } difficulty math problems covering: ${topicList}.
      Include calculation and word problems suitable for children.
      Format as JSON array: [{ problem: "text", answer: "answer", solution: "explanation", topic: "topic" }]
      Return only JSON array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = cleanJson(response.text());
    const problems = JSON.parse(text);

    res.json({ problems });
  } catch (error) {
    console.error("Error generating math challenge:", error);
    res.status(500).json({
      error: "Failed to generate math challenge.",
      details: error.message,
    });
  }
};

export const submitMathAnswers = async (req, res) => {
  try {
    const { childId } = req.params;
    const { problemsWithAnswers } = req.body;

    if (!childId || !problemsWithAnswers) {
      return res.status(400).json({ error: "Missing childId or answers." });
    }

    const result = await processGameSubmission(
      childId,
      "MATH",
      problemsWithAnswers
    );

    res.status(200).json({
      message: "Math results submitted successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Error submitting math answers:", error);
    res.status(500).json({ error: "Failed to process game submission." });
  }
};

export const generateCodeDetective = async (req, res) => {
  try {
    const { puzzleType, difficulty } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    let prompt;
    switch (puzzleType) {
      case "pattern":
        prompt = `Generate 3 ${
          difficulty || "medium"
        } pattern recognition puzzles for children.
        Format as JSON array: [{ sequence: ["1","2","3"], options: ["a","b","c","d"], correctIndex: 0, explanation: "why" }]`;
        break;
      case "logic":
        prompt = `Generate 3 ${
          difficulty || "medium"
        } logic puzzles suitable for children.
        Format as JSON array: [{ puzzle: "text", question: "what to solve", options: ["a","b","c","d"], correctIndex: 0, explanation: "solution" }]`;
        break;
      case "riddle":
        prompt = `Generate 5 ${difficulty || "easy"} riddles with hints.
        Format as JSON array: [{ riddle: "riddle text", hint: "hint", answer: "answer", explanation: "why" }]`;
        break;
      default:
        prompt = `Generate 3 mixed logic/pattern puzzles at ${
          difficulty || "medium"
        } difficulty.
        Format as JSON array with puzzle description, question, options, correctIndex, and explanation.`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = cleanJson(response.text());
    const puzzles = JSON.parse(text);

    res.json({ puzzleType, puzzles });
  } catch (error) {
    console.error("Error generating code detective puzzles:", error);
    res.status(500).json({
      error: "Failed to generate puzzles.",
      details: error.message,
    });
  }
};

export const submitCodeDetectiveAnswers = async (req, res) => {
  try {
    const { childId } = req.params;
    const { puzzleType, puzzlesWithAnswers } = req.body;

    if (!childId || !puzzleType || !puzzlesWithAnswers) {
      return res
        .status(400)
        .json({ error: "Missing childId, puzzleType, or answers." });
    }

    const gameSessionType = puzzleType.toUpperCase();
    const result = await processGameSubmission(
      childId,
      gameSessionType,
      puzzlesWithAnswers
    );

    res.status(200).json({
      message: `${puzzleType} results submitted successfully.`,
      ...result,
    });
  } catch (error) {
    console.error("Error submitting code detective answers:", error);
    res.status(500).json({ error: "Failed to process game submission." });
  }
};
