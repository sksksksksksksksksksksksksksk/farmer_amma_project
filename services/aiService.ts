
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are 'AgriChain AI', the intelligent layer of a decentralized agricultural supply chain protocol.
Your purpose is to assist users (Farmers, Distributors, Retailers, and Customers) with:
1. Explaining how blockchain provenance ensures food safety.
2. Interpreting batch data and transaction hashes.
3. Providing insights on sustainable farming and cold-chain logistics.
4. Troubleshooting app navigation.

Guidelines:
- Keep responses professional, helpful, and concise (max 3 sentences).
- If a user provides a Batch ID, explain that it represents a unique cryptographic anchor for that crop.
- Use agricultural and tech-forward terminology.
- Always refer to the system as 'AgriChain Protocol'.
`;

export const aiService = {
  async ask(prompt: string) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        },
      });
      return response.text;
    } catch (error) {
      console.error("AI Node Error:", error);
      return "The AI Protocol Node is currently undergoing maintenance. Please try again shortly.";
    }
  },

  async extractBatchIdFromImage(base64Image: string, mimeType: string): Promise<string | null> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            },
            {
              text: "Extract the AgriChain Batch ID from this image. The Batch ID typically looks like 'ABCDEF-1234' (alphanumeric characters, a hyphen, and digits). Return ONLY the Batch ID string. If no Batch ID is found, return 'NONE'."
            }
          ]
        },
        config: {
          temperature: 0.1,
          topP: 1,
        }
      });

      const text = response.text?.trim() || 'NONE';
      if (text === 'NONE' || text.length < 4) return null;
      
      // Clean up the response in case it returned extra text
      const pattern = /([A-Z0-9]{4,10}-\d{3,6})/i;
      const match = text.match(pattern);
      return match ? match[1].toUpperCase() : null;
    } catch (error) {
      console.error("AI Extraction Error:", error);
      return null;
    }
  }
};
