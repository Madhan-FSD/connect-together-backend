const USER = require("../../models/auth/user");
const Counter = require("../../models/auth/counter");
const {
  responseHandler,
  errorResponse,
  STATUS,
} = require("../../utils/responseHandler");

const getNextChildId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "childUserId" },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );

  const formatted = String(counter.value).padStart(3, "0");
  return `peer${formatted}`;
};

export const onBoarding = async (req, res) => {
  try {
    const { email, hasChild, childData } = req.body;

    const user = await USER.findOne({ email });
    if (!user) return responseHandler(res, STATUS.NOT_FOUND, "User not found");

    if (
      user.audit?.hasChild ||
      user.role?.role === "parent" ||
      (user.children && user.children.length > 0)
    ) {
      return responseHandler(
        res,
        STATUS.BAD,
        "User has already completed onboarding",
      );
    }

    if (!hasChild) {
      user.audit.hasChild = false;
      await user.save();

      return responseHandler(
        res,
        STATUS.CREATED,
        "Onboarding completed successfully",
        {
          user,
        },
      );
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

      return responseHandler(
        res,
        STATUS.CREATED,
        "Onboarding completed successfully",
        {
          user,
        },
      );
    }

    return responseHandler(res, S, "Invalid onboarding data");
  } catch (error) {
    console.error("Onboarding Error:", error);
    return errorResponse(res, error);
  }
};

export default { onBoarding };
