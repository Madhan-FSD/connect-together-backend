import Connection from "../models/connections.model.js";

const CONNECTION_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "BLOCKED"];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateConnectionSeeds = async (users) => {
  const docs = [];
  const userIds = users.map((u) => u._id);

  const pairSet = new Set();

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      // 55% chance these users have a connection
      if (Math.random() < 0.55) {
        const requester = userIds[i];
        const recipient = userIds[j];

        const key = `${requester}-${recipient}`;
        if (!pairSet.has(key)) {
          pairSet.add(key);

          const status =
            CONNECTION_STATUSES[rand(0, CONNECTION_STATUSES.length - 1)];

          docs.push({
            requester,
            recipient,
            status,
            requestMessage:
              status === "PENDING" ? "Let's connect and collaborate!" : "",
          });
        }
      }
    }
  }

  return docs;
};

export const seedConnections = async (users) => {
  try {
    const connectionDocs = await generateConnectionSeeds(users);

    await Connection.insertMany(connectionDocs);

    console.log(`🔗 Inserted ${connectionDocs.length} user connections`);
  } catch (err) {
    console.error("❌ Connection seeding failed:", err);
  }
};
