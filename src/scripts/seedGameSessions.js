const GAME_TYPES = [
  "TRIVIA",
  "STORY_ADVENTURE",
  "ANAGRAM",
  "WORD_ASSOCIATION",
  "RHYME_TIME",
  "VOCABULARY",
  "MATH",
  "PATTERN",
  "LOGIC",
  "RIDDLE",
  "OBJECT_BUILDER",
];

// Helper to generate random integer
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate random details based on game type
const randomDetails = (type) => {
  switch (type) {
    case "TRIVIA":
      return {
        questionsAttempted: rand(5, 15),
        correctAnswers: rand(2, 10),
      };

    case "MATH":
      return {
        operations: ["ADD", "SUB", "MULT"][rand(0, 2)],
        problemsSolved: rand(5, 12),
      };

    case "ANAGRAM":
      return {
        wordsPlayed: rand(5, 12),
        hardestWord: "EDUCATION",
      };

    case "RHYME_TIME":
      return {
        rhymePairsFound: rand(3, 10),
      };

    case "STORY_ADVENTURE":
      return {
        chaptersCompleted: rand(1, 5),
        choicesMade: rand(4, 12),
      };

    default:
      return { actions: rand(5, 20) };
  }
};

export async function generateGameSessions(childrenList) {
  const sessions = [];

  for (const child of childrenList) {
    const sessionsCount = rand(10, 25); // random game plays per child

    for (let i = 0; i < sessionsCount; i++) {
      const gameType = GAME_TYPES[rand(0, GAME_TYPES.length - 1)];

      const maxScore = rand(50, 200);
      const score = rand(10, maxScore);
      const coins = Math.floor(score / 10);

      sessions.push({
        childId: child._id,
        gameType,
        score,
        maxScore,
        coinsEarned: coins,
        details: randomDetails(gameType),
        playedAt: new Date(Date.now() - rand(0, 30) * 86400000), // random last 30 days
      });
    }
  }

  await GameSession.insertMany(sessions);
  console.log(`🎮 Seeded ${sessions.length} game sessions successfully!`);
}
