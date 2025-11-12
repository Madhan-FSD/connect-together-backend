import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import GameSession from "../models/gamesession.model.js";
import { updateDailySummaryAndWallet } from "../utils/gameUtils.js";
import { cleanJson } from "../utils/aiUtils.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const processGameSubmission = async (
  parentId,
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
      let isQuestionCorrect = false;
      if (
        q.userAnswerIndex !== undefined &&
        q.userAnswerIndex === q.correctAnswer
      ) {
        isQuestionCorrect = true;
      } else if (
        q.userAnswerIndex !== undefined &&
        q.userAnswerIndex === q.correctIndex
      ) {
        isQuestionCorrect = true;
      } else if (q.isCorrect === true) {
        isQuestionCorrect = true;
      }
      if (isQuestionCorrect) {
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
    childId,
    gameType,
    score,
    maxScore,
    coinsEarned,
    details: questionsWithAnswers,
  });

  await updateDailySummaryAndWallet(
    parentId,
    childId,
    session._id,
    coinsEarned,
    score
  );

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
    Return only a JSON array.`;
    const result = await model.generateContent(prompt);
    const text = cleanJson((await result.response).text());
    res.json({ questions: JSON.parse(text) });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate trivia questions." });
  }
};

export const submitTriviaAnswers = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.parentId;
    const { questionsWithAnswers } = req.body;
    if (!childId || !questionsWithAnswers)
      return res.status(400).json({ error: "Missing childId or answers." });
    const result = await processGameSubmission(
      parentId,
      childId,
      "TRIVIA",
      questionsWithAnswers
    );
    res
      .status(200)
      .json({ message: "Trivia results submitted successfully.", ...result });
  } catch {
    res.status(500).json({ error: "Failed to process game submission." });
  }
};

export const generateStoryAdventure = async (req, res) => {
  try {
    const { genre, previousStory, userChoice } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const formatInstruction =
      "Format as JSON: { story: 'text', choices: ['choice1', 'choice2', 'choice3'], correctAnswer: INDEX }";
    const prompt = !previousStory
      ? `Create an interactive ${
          genre || "adventure"
        } story. Write the opening scene (3-4 sentences) and provide 3 choices. Choose one as best and include its index (0,1,2). ${formatInstruction}`
      : `Continue the story: ${previousStory}. User chose: ${userChoice}. Continue for 3-4 sentences and provide 3 choices with one correct index. ${formatInstruction}`;
    const result = await model.generateContent(prompt);
    const text = cleanJson((await result.response).text());
    res.json(JSON.parse(text));
  } catch {
    res.status(500).json({ error: "Failed to generate story." });
  }
};

export const submitStoryChoice = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.parentId;
    const { storySegment, choice, isCorrect } = req.body;
    if (!childId || !storySegment || choice === undefined)
      return res.status(400).json({ error: "Missing fields." });
    const result = await processGameSubmission(
      parentId,
      childId,
      "STORY_ADVENTURE",
      { storySegment, choice, isCorrect: isCorrect || false }
    );
    res.status(200).json({ message: "Story choice submitted.", ...result });
  } catch {
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
        prompt = `Generate 5 ${difficulty || "medium"} anagram puzzles about ${
          category || "animals"
        }. **Ensure 'scrambled' is a perfect reordering of all characters in 'correctAnswer' and is the same length.**
        Format as JSON array: [{ scrambled: "w o r d", correctAnswer: "word", hint: "hint" }]`;
        break;
      case "word-association":
        prompt = `Generate a word association game with 1 main word and 8 related words (4 strongly correct, 4 clearly incorrect/distractors) about ${
          category || "nature"
        }.
        Format as JSON: { mainWord: "word", correctWords: ["w1","w2","w3","w4"], distractors: ["w1","w2","w3","w4"] }`;
        break;
      case "rhyme-time":
        prompt = `Generate 5 ${
          difficulty || "medium"
        } "Rhyme Time" questions. **Ensure the option at 'correctIndex' is the only word in 'options' that perfectly rhymes with 'word'.**
Each item should contain:
- "word": a main word to rhyme with
- "options": 3 total (1 correct, 2 incorrect)
- "correctIndex": random (0,1,2)
Randomize correctIndex across questions.
Format strictly as JSON array.`;
        break;
      default:
        prompt = `Generate 5 ${
          difficulty || "medium"
        } vocabulary challenges. **Ensure 'word', 'definition', 'usageExample', and 'correctAnswer' are all logically consistent for the vocabulary item.**
Format as JSON array: [{ word: "word", definition: "definition", usageExample: "example", correctAnswer: "word" }]`;
    }
    const result = await model.generateContent(prompt);
    const text = cleanJson((await result.response).text());
    res.json({ gameType, gameData: JSON.parse(text) });
  } catch {
    res.status(500).json({ error: "Failed to generate word game." });
  }
};

export const submitWordMasterAnswers = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.parentId;
    const { gameType, answers } = req.body;
    if (!childId || !gameType || !answers)
      return res.status(400).json({ error: "Missing fields." });
    const result = await processGameSubmission(
      parentId,
      childId,
      gameType.toUpperCase().replace("-", "_"),
      answers
    );
    res.status(200).json({
      message: `${gameType} results submitted successfully.`,
      ...result,
    });
  } catch {
    res.status(500).json({ error: "Failed to process game submission." });
  }
};

export const generateMathChallenge = async (req, res) => {
  try {
    const { difficulty, problemCount, topics } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `Generate ${problemCount || 5} ${
      difficulty || "medium"
    } math problems covering ${topics?.join(", ") || "arithmetic"}.
Format as JSON array: [{ problem: "text", correctAnswer: "answer", solution: "explanation", topic: "topic" }]`;
    const result = await model.generateContent(prompt);
    const text = cleanJson((await result.response).text());
    res.json({ problems: JSON.parse(text) });
  } catch {
    res.status(500).json({ error: "Failed to generate math challenge." });
  }
};

export const submitMathAnswers = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.parentId;
    const { problemsWithAnswers } = req.body;
    if (!childId || !problemsWithAnswers)
      return res.status(400).json({ error: "Missing fields." });
    const result = await processGameSubmission(
      parentId,
      childId,
      "MATH",
      problemsWithAnswers
    );
    res
      .status(200)
      .json({ message: "Math results submitted successfully.", ...result });
  } catch {
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
        } pattern recognition puzzles.
Format as JSON array: [{ sequence: ["1","2","3"], options: ["a","b","c","d"], correctIndex: random(0-3), explanation: "why" }]`;
        break;
      case "logic":
        prompt = `Generate 3 ${difficulty || "medium"} logic puzzles.
Format as JSON array: [{ puzzle: "text", question: "?", options: ["a","b","c","d"], correctIndex: random(0-3), explanation: "solution" }]`;
        break;
      case "riddle":
        prompt = `Generate 5 ${difficulty || "easy"} riddles with hints.
Format as JSON array: [{ riddle: "text", hint: "hint", correctAnswer: "answer", explanation: "why" }]`;
        break;
      default:
        prompt = `Generate 3 mixed puzzles at ${
          difficulty || "medium"
        } difficulty.
Format as JSON array: [{ puzzle: "text", options: ["a","b","c","d"], correctIndex: random(0-3), explanation: "why" }]`;
    }
    const result = await model.generateContent(prompt);
    const text = cleanJson((await result.response).text());
    res.json({ puzzleType, puzzles: JSON.parse(text) });
  } catch {
    res.status(500).json({ error: "Failed to generate puzzles." });
  }
};

export const submitCodeDetectiveAnswers = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.parentId;
    const { puzzleType, puzzlesWithAnswers } = req.body;
    if (!childId || !puzzleType || !puzzlesWithAnswers)
      return res.status(400).json({ error: "Missing fields." });
    const result = await processGameSubmission(
      parentId,
      childId,
      puzzleType.toUpperCase(),
      puzzlesWithAnswers
    );
    res.status(200).json({
      message: `${puzzleType} results submitted successfully.`,
      ...result,
    });
  } catch {
    res.status(500).json({ error: "Failed to process game submission." });
  }
};

export const getGameReport = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId)
      return res.status(400).json({ error: "Missing sessionId." });
    const session = await GameSession.findById(sessionId).select(
      "gameType score maxScore details coinsEarned createdAt -_id"
    );
    if (!session)
      return res.status(404).json({ error: "Game session not found." });
    res.status(200).json({
      gameType: session.gameType,
      score: session.score,
      maxScore: session.maxScore,
      coinsEarned: session.coinsEarned,
      details: session.details,
    });
  } catch {
    res.status(500).json({ error: "Failed to retrieve game report." });
  }
};
