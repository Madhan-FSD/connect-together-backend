import CuratedChannel from "../models/curatedchannel.model.js";
import Follower from "../models/follower.model.js";
import UserChannel from "../models/userchannel.model.js";
import ChildChannel from "../models/childchannel.model.js";
import { canAccessItem } from "../utils/visibility.js";
import { User } from "../models/user.model.js";

const isSubscriber = async (userId, channelDoc) => {
  if (!userId || !channelDoc) return false;
  const type = channelDoc.childId ? "CHILD_CHANNEL" : "USER_CHANNEL";
  const entry = await Follower.findOne({
    follower: userId,
    followedEntity: channelDoc._id,
    followedEntityType: type,
  }).lean();
  return !!entry;
};

const hasPaidAccess = async (userId, channelDoc) => {
  if (!userId || !channelDoc) return false;
  if (channelDoc.owner && userId.toString() === channelDoc.owner.toString())
    return true;
  if (
    channelDoc.parentId &&
    userId.toString() === channelDoc.parentId.toString()
  )
    return true;
  return false;
};

const getCuratedOwner = async (ownerId) => {
  if (!ownerId) return null;
  return await User.findById(ownerId)
    .select("_id firstName lastName avatar")
    .lean();
};

export const getCuratedByHandle = async (req, res) => {
  try {
    const { handle } = req.params;
    const viewerId = req.userId || null;

    const normalized = String(handle).toLowerCase().replace(/^@/, "");

    const curated = await CuratedChannel.findOne({ handle: normalized }).lean();
    if (!curated)
      return res.status(404).json({ error: "Curated channel not found." });

    const ownerDetails = await getCuratedOwner(curated.curatedBy);

    const channelDoc =
      (await UserChannel.findById(curated.channelRef)) ||
      (await ChildChannel.findById(curated.channelRef));

    const owner =
      channelDoc &&
      channelDoc.owner &&
      viewerId &&
      channelDoc.owner.toString() === viewerId.toString();

    const parent =
      channelDoc &&
      channelDoc.parentId &&
      viewerId &&
      channelDoc.parentId.toString() === viewerId.toString();

    const subscribed = viewerId
      ? await isSubscriber(viewerId, channelDoc)
      : false;
    const paid = viewerId ? await hasPaidAccess(viewerId, channelDoc) : false;

    const content = curated.content.map((item) => {
      const allowed = canAccessItem({
        itemVisibility: item.visibility,
        channelVisibility: curated.visibility,
        subscribed,
        paid,
        owner,
        parent,
      });

      if (!allowed) return { ...item, restricted: true };
      return { ...item, restricted: false };
    });

    return res.status(200).json({
      curated: {
        ...curated,
        content,
      },
      owner: ownerDetails,
      access: {
        isOwner: !!owner,
        isParent: !!parent,
        isSubscribed: !!subscribed,
        isPaid: !!paid,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch curated channel.",
      details: err?.message,
    });
  }
};
