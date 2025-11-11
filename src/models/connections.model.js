import mongoose from "mongoose";

const ConnectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "BLOCKED"],
      default: "PENDING",
    },
    requestMessage: {
      type: String,
      maxlength: 300,
      default: "",
    },
  },
  { timestamps: true }
);

ConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

ConnectionSchema.index({ status: 1 });
ConnectionSchema.index({ recipient: 1, status: 1 });

export default mongoose.model("Connection", ConnectionSchema);
