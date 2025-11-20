import FeatureStore from "./featureStore.js";

function normalizeItem(item) {
  return {
    views: item.viewsCount ?? item.views ?? 0,
    likes: item.likeCount ?? item.likes ?? 0,
    comments: item.commentsCount ?? item.comments ?? 0,
    shares: item.sharesCount ?? item.shares ?? 0,
    createdAt: item.createdAt ?? Date.now(),
  };
}

export async function buildFeaturePayload(userId, item) {
  const n = normalizeItem(item);

  // Safe createdAt
  const created = n.createdAt ? new Date(n.createdAt).getTime() : Date.now();

  const recencyMinutes = (Date.now() - created) / 60000;

  // SAFE Redis feature extraction
  const h1 = await FeatureStore.sumBuckets(item._id, "views", 60).catch(
    () => 0
  );
  const h24 = await FeatureStore.sumBuckets(item._id, "views", 1440).catch(
    () => 0
  );

  const velocity = h24 > 0 ? h1 / (h24 / 24) : h1;

  return {
    views: n.views,
    likes: n.likes,
    comments: n.comments,
    shares: n.shares,
    velocity,
    recencyMinutes,
    avgWatchCompletion: 0.5,
    positiveReactionsRatio: n.likes / Math.max(1, n.views),
    userCategoryMatch: 0,
    userAuthorAffinity: 0,
    pastBehaviorScore: 0,
    socialGraph: 0,
  };
}
