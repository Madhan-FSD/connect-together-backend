const USER = require("../../models/auth/user");
const Counter = require("../../models/auth/counter");

const getNextChildId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "childUserId" },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );

  const formatted = String(counter.value).padStart(3, "0");
  return `peer${formatted}`;
};

exports.onBoarding = async (req, res) => {
  try {
    const { email, hasChild, childData } = req.body;

    const user = await USER.findOne({ email }).select("-password");
    if (!user) return res.status(400).json({ message: "User not found" });

    if (
      user.hasChild ||
      user.userType === "parent" ||
      user.children.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Onboarding already completed",
      });
    }

    if (!hasChild) {
      user.hasChild = false;
      await user.save();
      return res.status(200).json({
        success: true,
        message: "Onboarding skipped successfully",
        user,
      });
    }

    if (hasChild && childData) {
      const childArray = Array.isArray(childData) ? childData : [childData];
      user.userType = "parent";
      user.hasChild = true;

      const newChildren = [];

      for (let i = 0; i < childArray.length; i++) {
        const nextChildId = await getNextChildId();
        const newChild = {
          ...childArray[i],
          userId: nextChildId,
          parentId: user._id,
        };
        newChildren.push(newChild);
      }

      user.children.push(...newChildren);
      await user.save();

      return res.status(200).json({
        success: true,
        message: `${newChildren.length} child${
          newChildren.length > 1 ? "ren" : ""
        } added successfully`,
        user,
      });
    }

    return res.status(400).json({ message: "Invalid request body" });
  } catch (error) {
    console.error("Onboarding Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
