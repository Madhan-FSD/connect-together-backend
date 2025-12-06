export const seedPosts = [
  {
    title: "Why STEM learning matters early",
    content:
      "STEM learning builds curiosity and problem-solving skills. Here are 3 ways to introduce early thinking...",
    contentType: "POST_CHANNEL",
    postTarget: "CHANNEL",
    format: "TEXT",
    visibility: "PUBLIC",
    aiTags: ["STEM", "Education", "Kids"],
  },

  {
    title: "Creative drawing hacks for kids",
    content: "Here are some useful tricks for young artists!",
    mediaUrl:
      "https://images.pexels.com/photos/414379/pexels-photo-414379.jpeg?auto=compress&cs=tinysrgb&w=900",
    mediaPublicId: "art_post",
    contentType: "POST_CHANNEL",
    postTarget: "CHANNEL",
    format: "IMAGE",
    visibility: "PUBLIC",
    aiTags: ["Creativity", "Child Art"],
  },

  {
    title: "Parenting tip — how to build consistency",
    content:
      "Consistency is the foundation of discipline. Here are 5 practical ways to build it.",
    contentType: "POST_CHANNEL",
    postTarget: "CHANNEL",
    format: "TEXT",
    visibility: "SUBSCRIBERS_ONLY",
    aiSummary: "A parenting guide about building habits for children.",
    aiTags: ["Parenting", "Habits", "Psychology"],
  },

  {
    title: "Behind the scenes — learning game demo",
    content: "Sneak peek of our game mechanics!",
    mediaUrl:
      "https://images.pexels.com/photos/4195325/pexels-photo-4195325.jpeg?auto=compress&cs=tinysrgb&w=900",
    mediaPublicId: "bts_dev",
    contentType: "POST_CHANNEL",
    postTarget: "CHANNEL",
    format: "IMAGE",
    visibility: "SUBSCRIBERS_ONLY",
    aiTags: ["Game Development", "Learning"],
  },

  {
    title: "Premium — logical thinking challenge set",
    content:
      "Download the worksheet and solve the challenges — boost reasoning!",
    mediaUrl:
      "https://images.pexels.com/photos/5905707/pexels-photo-5905707.jpeg?auto=compress&cs=tinysrgb&w=900",
    mediaPublicId: "premium_challenge",
    contentType: "POST_PROFILE",
    postTarget: "PROFILE",
    format: "IMAGE",
    visibility: "PAID_ONLY",
    aiTags: ["Critical Thinking", "Logic Training"],
  },
];
