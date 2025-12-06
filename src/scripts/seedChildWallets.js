import ChildWallet from "../models/childwallet.model.js";

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const seedChildWallets = async (children) => {
  try {
    const wallets = children.map((child) => ({
      childId: child._id,
      currentBalance: rand(50, 250),
      lastUpdate: new Date(),
    }));

    await ChildWallet.insertMany(wallets);

    console.log(`🪙 Inserted ${wallets.length} child wallets`);
  } catch (err) {
    console.error("❌ Child wallet seeding failed:", err);
  }
};
