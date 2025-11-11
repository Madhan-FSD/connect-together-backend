import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  type: { type: String, enum: ["VIDEO", "POST"], required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  summary: { type: String },
  isCompleted: { type: Boolean, default: false },
});

const channelSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parent.children",
    required: true,
  },
  childName: { type: String, required: true },
  channelName: { type: String, required: true },
  description: { type: String },
  content: [contentSchema],
});

const CuratedChannel = mongoose.model("CuratedChannel", channelSchema);
export default CuratedChannel;
