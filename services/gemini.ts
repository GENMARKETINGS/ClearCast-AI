
import { GoogleGenAI } from "@google/genai";

export async function removeWatermarkFromImage(
  base64Image: string,
  mimeType: string,
  instruction: string = "Please remove the watermark and any logos or branding text from this image. Seamlessly inpaint the area to match the surrounding texture and background as if the object was never there."
): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: instruction,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    return null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function processVideoWatermark(
  prompt: string,
  aspectRatio: "16:9" | "9:16" = "16:9"
): Promise<string | null> {
  try {
    // Note: Veo models require a fresh instance to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `${prompt}. Ensure the video is completely clean with no watermarks, logos, or overlays. High quality, seamless textures.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      // Re-fetch operation status
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    // Append API key for download
    return `${downloadLink}&key=${process.env.API_KEY}`;
  } catch (error) {
    console.error("Video Generation Error:", error);
    throw error;
  }
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
