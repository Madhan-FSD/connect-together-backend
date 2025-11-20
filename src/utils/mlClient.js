import axios from "axios";

export async function getMLScore(features) {
  try {
    const res = await axios.post("http://localhost:9000/predict", features);
    return res.data.score ?? 0;
  } catch (err) {
    console.error("ML error:", err.message);
    return 0; // fallback score
  }
}
