import { GoogleGenerativeAI } from "@google/generative-ai";

export const getGenAI = () => {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};
