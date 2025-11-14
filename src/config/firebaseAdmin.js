import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = {
  type: "service_account",
  project_id: "connect-together-firebase",
  private_key_id: "9f3f00c094a9d80882f05953dd2e4e745dc51dd8",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCqTYtUEdjhpPue\nbjmoLvRDZ+8R3J9wxem3O/r/ZgBxVq2VPuTWuDiXHVrZupnHOo+beRD5fjmaH6gn\nM618TYmU5iu6QXiej1b6cGxIa3mSEUasQi4r/+slnhN3YJ1kL784ZaKUeduvBwF5\nnRDBKNAgP+Z+8bciyPVYRfcV7qyaJ6gT6xJzkT2I3qiI0Mij/KRA7RzQOnNwWRAm\nWk+88Q+albntgnOyfMzJf9NnOFV35Sp4Hh2yWI4EjXRBeh2rU6uLFSEQNJ9EBfZD\nLkME+oas499Vp6mwvk7NQaE2HsIVmi8zEy66mHsFIJ5wOfhI2MffEUOLvYZUHxpC\ncZVNcG3lAgMBAAECggEABqo36IeK8jMXk9ji0cWwp+NX6bOK29+AU5GkiOfwNCn9\nFh5a11poqzqqCmOxTqjojjWb5/URgl94dbxMhFUGgY4hKk4TTzqd3/mUC0uFe6Vz\nG3JlmzGN/YVlDqLN1hTA9OSUCx/abKGnZEqKKX0UPsbcGZ4Sbuk9d4HEIewa04I8\ncDYiU4ZRSVJrTKGEncAFFCD5CS0Hhb5dkJe6u0FvrhIURiRcxC/wj0qXuh9XHcTv\n82t4lrgRhvKl5MYR4Rd8kwrCyHwPqJz8g1bL720ND5BjZmiuhEpJDPERb4BrEHHY\nGIgoVnCBlmLYItR6sv/o7kmqXNIev/OecF6c0guVywKBgQDcZeNuZc058SdgoCq1\nJfHc4mLF5+lKGBNX9JB53UTs2syWGd2SXrznA7KhQTTZNOc5FVlOBPlMKtezxFdq\nz69EBlJRpQ9fxx2MITcbvCY7PcYJc7ir5Yr5FVpiuhAJIsXUPcgQ5gPlQG8IzvM9\nrXjdN3oP0JlNGmM9wyM4lykCwwKBgQDF0BMy1cHNw3794Ht/nIVdTf/zcnMgpo1r\ngpb7fM8XxOqxMA5S11jiTlyfjcLRI/Y8Rn8kVOxiATfFtBXfzpSND7+VdBPZkBts\nHPGnL/pB9QTR08CNm75Fk35Wdzbwn7IVJwHvNW4J1+GGbLKFwkHMDy93Ws719kY6\nSbxE26JyNwKBgEXvnuedLi5As7oZmPO6grEQtT8PhBua4Ch81ouVBxYRp/HJa2HS\n5iZ4Keq5gkeaXfTjLV9wfJsKzT+iAgtGs9rmFqEJu4Ms79dTguUuIwORapH9QpBp\nWlwHxpKlcAk2G4hpwl56XqoUdCdbZBwiO8QWooj6LGsnAG7MyRRgAwd5AoGAa5Ul\ny+D7nWf0mijLofTDh6JTUNjvClPq2AzXBoGzs+6x4ZoMQDvEqJgLwe78hHg1hESn\nA2B4izi0V38A4o7ctfdZr/PIk+vPLjZzqwTp65NRgrjSoXGRww9bh7UgmS+RT/W+\nFJYPeaUCj/RwB1VGKbAclaI6qwS83xiZHy4ApHMCgYEAmSu5cOJjrMCI8ssCzLdI\nkMptj3sGe4eEnILOPmqa3BEbh5iw6wOtqekIz2oKL05VBbCIe7lVU1/9vHs1jAO3\n16atrr3GeMYiMfMY7GvTTsMPSvXx5Gcc1gBUBDuTDaIX7FZXHKopTwIc30DzR3ot\nqYwZg8lJiLZC++cj7Zaeinc=\n-----END PRIVATE KEY-----",
  client_email:
    "firebase-adminsdk-fbsvc@connect-together-firebase.iam.gserviceaccount.com",
  client_id: "115027838066403580842",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40connect-together-firebase.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

let isInitialized = false;

export const initializeFirebaseAdmin = () => {
  if (isInitialized) return admin;

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    isInitialized = true;
    console.log("✅ Firebase Admin initialized");
    return admin;
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
    throw error;
  }
};

const initializedAdmin = initializeFirebaseAdmin();
export default initializedAdmin;
