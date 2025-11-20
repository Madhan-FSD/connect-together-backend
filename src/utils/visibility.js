export const canAccessItem = ({
  itemVisibility,
  channelVisibility,
  subscribed,
  paid,
  owner,
  parent,
}) => {
  const ownerOrParent = !!(owner || parent);

  if (itemVisibility === "PUBLIC") return true;
  if (itemVisibility === "SUBSCRIBERS_ONLY") return subscribed || ownerOrParent;
  if (itemVisibility === "PAID_ONLY") return paid || ownerOrParent;
  if (itemVisibility === "PRIVATE") return ownerOrParent;

  if (channelVisibility === "PUBLIC") return itemVisibility === "PUBLIC";
  if (channelVisibility === "SUBSCRIBERS_ONLY")
    return subscribed || ownerOrParent;
  if (channelVisibility === "PAID_ONLY") return paid || ownerOrParent;
  if (channelVisibility === "PRIVATE") return ownerOrParent;

  return false;
};
