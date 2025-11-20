import fs from "fs";

const OUTPUT = "training_data.csv";
const ROWS = 1000;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(random(min, max));
}

function generateRow() {
  const views = randomInt(10, 5000);
  const likes = randomInt(0, views * 0.2);
  const comments = randomInt(0, likes * 0.3);
  const shares = randomInt(0, likes * 0.2);

  const h1 = randomInt(0, views * 0.1);
  const h24 = randomInt(h1, views);
  const velocity = h24 > 0 ? h1 / Math.max(1, h24 / 24) : h1;

  const recencyMinutes = randomInt(0, 1440);
  const avgWatchCompletion = Math.random();
  const positiveReactionsRatio = likes / Math.max(1, views);

  const userCategoryMatch = Math.random();
  const userAuthorAffinity = Math.random();
  const pastBehaviorScore = Math.random();
  const socialGraph = randomInt(0, 10);

  const label = likes > views * 0.02 ? 1 : 0;

  return [
    label,
    views,
    likes,
    comments,
    shares,
    velocity,
    recencyMinutes,
    avgWatchCompletion,
    positiveReactionsRatio,
    userCategoryMatch,
    userAuthorAffinity,
    pastBehaviorScore,
    socialGraph,
  ].join(",");
}

function run() {
  const out = fs.createWriteStream(OUTPUT);
  out.write(
    "label,views,likes,comments,shares,velocity,recencyMinutes,avgWatchCompletion,positiveReactionsRatio,userCategoryMatch,userAuthorAffinity,pastBehaviorScore,socialGraph\n"
  );

  for (let i = 0; i < ROWS; i++) {
    out.write(generateRow() + "\n");
  }

  out.end();
  console.log("Synthetic training_data.csv generated with", ROWS, "rows.");
}

run();
