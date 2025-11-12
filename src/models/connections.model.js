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

ConnectionSchema.post("save", async function (doc, next) {
  const User = mongoose.model("User");

  if (doc.status === "ACCEPTED" && doc.isNew) {
    try {
      await User.updateMany(
        { _id: { $in: [doc.requester, doc.recipient] } },
        { $inc: { connectionCount: 1 } }
      );
    } catch (e) {
      console.error("Error updating connectionCount on User (post save):", e);
    }
  }
  next();
});

ConnectionSchema.post(
  "deleteOne",
  { document: true, query: false },
  async function (doc, next) {
    const User = mongoose.model("User");

    if (doc.status === "ACCEPTED") {
      try {
        await User.updateMany(
          { _id: { $in: [doc.requester, doc.recipient] } },
          { $inc: { connectionCount: -1 } }
        );
      } catch (e) {
        console.error(
          "Error updating connectionCount on User (post delete):",
          e
        );
      }
    }
    next();
  }
);

export default mongoose.model("Connection", ConnectionSchema);
