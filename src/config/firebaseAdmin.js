import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = {
  type: "service_account",
  project_id: "pp-chat-v2-real",
  private_key_id: "8dd79f3f5cf9e526ff5c755bd10fc9943445a48c",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDLM7S0CySSCmzc\nNnAzqEchupJpPcv76K/p89LjjHX/YCsyC/Nc58jwtECvq9T6xDmO4R9McoZgsDhd\nbiJ2dfZq07DCtkf/CBd3vyQJOAeQoCWvwA71qnABsD9jVzhRErCVL0TZ7Qfmmg9H\nu52v25AzwzaNupTORS0Y79oxfyOYkSdh2k5WIjQrsyQUS1N7L8Z+UhEI7czMrGHO\nrn+BondxLW1HiFfNF0hi8tP7zZ1VwMlyVA00wCOdCieRZssNm4IIMSn8yc2Fonaw\nnxjz4HTVmwhC5L1wRkvcwuaVNy4FYsCUoRm+78SKxyBRajfvz8IRgA9VZgZ+Kjhm\nOWy9CCbrAgMBAAECggEAMeHHgksZ9x/ICWbztDqi+4ypVFxvLq+4P14zbtiUPtSE\nxgxY+X2MvkoBdx5fcg+pcYGiBUo34pRfwc+/dgUPMLo2shW9JsX9vM+XMQwoD0DA\n/5vOEFB+nmt9pA1NLdnAr16jMDwXrGw1RA6ybvEfPRW21qPu05P3th9rGKt1OYY4\nCQXvFlhqLjAtW2ro7Ha6UHwApwaYXavrDYKXEsY56poopNPU9VrnG+6OfAI6+8w5\n8qiDKfn9svrSaIIpEdVZG51dbLkBrRBJwA1dTiS0RScYXlyUoQg7O9D28MacsWfe\ntY5VlnmsnT1PnCUqAAWt/icV8tJX8EP4ox2+/pAtQQKBgQD6ByWLeziuSlbT2ZPn\nvdIvD1d1x9acwPQHb1Up2CAG8l1zYC88WY+LR5bEhuSXba0SIAo00gAmFHcDVmHO\nkOMrekl+AmcfuPITe/EtVDhslhdSfPkw+j+R6PxLJUmH+Kq8jr9LCYCbU+qYDlRL\nX87oOyg7x5I8tMQ9TSvTsK9zDwKBgQDQDjswIzn31f5PR/OQihG9gjpdl8szCHgu\nr5XbPdtY7oRO9MVIn7SawSQjJbfmv9ziv5mR0m/shgU+Zrzo0cgTlEtUvpRZ8I5q\n1p5ujzPldzfg997FZu10AA6dckI3TGxl1IlpTS/4mmEZ/0lBY5StedeyjZFrzEOY\ndHrqMmweZQKBgFcBoakWKjVMnUZ/kp60Sa4ispbEAgTuiH0F2ycClLKWKLr7n7Rq\nni8jrG2bW3Tur6l9CNA0u+SEfp3ks4iElukMVwLIp0Y8v9DT8quJgVEYMel8n+LR\nUsndv94OjbYJbLDNI/hiyCRFYX+kjOTl5ESgQXH8EwGZDike779s3sE1AoGACObS\n+XhIXqY1P0cg0KpXn/gWbzKzaveNzNGOY9b9r4xk9MvcNQNAQu7IkQhoGeNTnA/+\njhKm30PMraLPqlZvbQcHQhT1W/PC5CdSmABghAzZwzJXwbJprnDiLzJYSu1mJeU2\nC99Vkhlo1ifqBnYwQkvYQrdz5VzT943kRGjr31ECgYEAyOknTnRvr5jmJFxutsk8\n86FPBnkRoSNAHaa5tco/GG9c1o4Xo+2gVN67s3/VZSkkqvYpMU8X8D1sUII59uPD\nQ9NPTp6I48yAHIktmrgoldljl+bC12JcB6KCMNcOu+q/yHmieSXBScbUB7kI7EzJ\nY1hNJq6YaZGUCYBhRpBBjvU=\n-----END PRIVATE KEY-----\n",
  client_email:
    "firebase-adminsdk-fbsvc@pp-chat-v2-real.iam.gserviceaccount.com",
  client_id: "111105367800015796437",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40pp-chat-v2-real.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

let isInitialized = false;

export const initializeFirebaseAdmin = () => {
  if (isInitialized) return admin;

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://pp-chat-v2-real-default-rtdb.firebaseio.com",
    });

    isInitialized = true;
    console.log("Firebase Admin initialized");
    return admin;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
};

const initializedAdmin = initializeFirebaseAdmin();
export default initializedAdmin;
