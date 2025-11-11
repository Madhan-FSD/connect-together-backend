import mongoose from "mongoose";

const ChildWalletSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    unique: true,
  },
  currentBalance: {
    type: Number,
    default: 0,
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
  },
});

const ChildWallet = mongoose.model("ChildWallet", ChildWalletSchema);
export default ChildWallet;
