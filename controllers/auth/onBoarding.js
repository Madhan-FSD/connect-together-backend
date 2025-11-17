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

    const user = await USER.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    if (
      user.audit?.hasChild ||
      user.role?.role === "parent" ||
      (user.children && user.children.length > 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Onboarding already completed",
      });
    }

    if (!hasChild) {
      user.audit.hasChild = false;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Onboarding skipped successfully",
        user,
      });
    }

    if (hasChild && childData) {
      const childrenArray = Array.isArray(childData) ? childData : [childData];

      user.audit.hasChild = true;
      user.role.role = "parent";

      const newChildren = [];

      for (const child of childrenArray) {
        const nextChildId = await getNextChildId();

        newChildren.push({
          ...child,
          userId: nextChildId,
          parentId: user._id,
        });
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

    return res.status(400).json({ message: "Invalid onboarding request" });
  } catch (error) {
    console.error("Onboarding Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
