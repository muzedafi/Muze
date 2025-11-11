import { GoogleGenAI, Modality, Type } from "@google/genai";

const handleError = (error: unknown, context: string): never => {
    console.error(`Error ${context}:`, error);
    // Let the original error message bubble up, as App.tsx will check for specific strings.
    const errorMessage = error instanceof Error ? error.message : `An unexpected error occurred during ${context}.`;
    throw new Error(errorMessage);
};

/**
 * Generates an image from a text prompt using the 'imagen-4.0-generate-001' model.
 * @param prompt The text prompt describing the image to generate.
 * @param aspectRatio The desired aspect ratio for the image.
 * @returns A promise that resolves to a base64 data URL of the generated image.
 */
export const generateImageFromText = async (prompt: string, aspectRatio: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 4,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("API tidak menghasilkan gambar apa pun. Ini mungkin karena pemicu filter keamanan. Coba sesuaikan prompt Anda.");
    }

    const imageUrls = response.generatedImages.map(img => {
        const base64ImageBytes = img.image?.imageBytes;
        if (!base64ImageBytes) {
            throw new Error("Respons API berisi entri gambar yang tidak valid.");
        }
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    });

    return imageUrls;
  } catch (error) {
    handleError(error, 'image generation from text');
  }
};


/**
 * Edits an existing image based on a text prompt using the 'gemini-2.5-flash-image' model.
 * @param prompt The text prompt describing the edits.
 * @param base64ImageDataUrl The base64 data URL of the image to edit.
 * @returns A promise that resolves to a base64 data URL of the edited image.
 */
export const editImageWithPrompt = async (prompt: string, base64ImageDataUrl: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const match = base64ImageDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid base64 image data URL format.");
    }
    const mimeType = match[1];
    const data = match[2];

    const imagePart = { inlineData: { mimeType, data } };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = response.candidates?.[0];

    // Try to find an image in the response
    for (const part of candidate?.content?.parts || []) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    // If no image is found, construct a detailed error message.
    let errorMessage = "Tidak ada data gambar yang ditemukan dalam respons API.";

    if (candidate) {
        switch (candidate.finishReason) {
            case 'SAFETY':
                errorMessage = "Pembuatan gambar diblokir karena kebijakan keamanan. Coba ubah prompt atau gambar referensi Anda.";
                break;
            case 'RECITATION':
                 errorMessage = "Pembuatan gambar diblokir karena terdeteksi kutipan. Harap ubah prompt Anda.";
                 break;
            case 'OTHER':
                 errorMessage = `Model berhenti karena alasan yang tidak terduga${candidate.finishMessage ? `: ${candidate.finishMessage}` : '.'}`;
                 break;
            default:
                // For 'STOP', 'MAX_TOKENS' or unspecified reasons, check for a text response.
                if (response.text) {
                    errorMessage = `Model merespons dengan teks alih-alih gambar: "${response.text}"`;
                } else {
                     errorMessage += " Model mungkin tidak dapat memenuhi permintaan tersebut.";
                }
                break;
        }
    } else if (response.text) {
        // Handle cases where there are no candidates but there is a text response
        errorMessage = `Model merespons dengan teks alih-alih gambar: "${response.text}"`;
    } else if (!response.candidates || response.candidates.length === 0) {
        errorMessage = "API tidak mengembalikan kandidat respons. Ini mungkin karena pemicu filter keamanan atau masalah internal model.";
    }
    
    throw new Error(errorMessage);

  } catch (error) {
    handleError(error, 'image editing');
  }
};

/**
 * Generates a video from a text prompt and optional reference image.
 * @param prompt The text prompt for the video.
 * @param aspectRatio The aspect ratio ('16:9' or '9:16').
 * @param resolution The resolution ('720p' or '1080p').
 * @param referenceImageUrl Optional base64 data URL for a reference image.
 * @param onProgress Callback function to update loading messages.
 * @returns A promise that resolves to a blob URL of the generated video.
 */
export const generateVideoFromPrompt = async (
    prompt: string,
    aspectRatio: '16:9' | '9:16',
    resolution: '720p' | '1080p',
    referenceImageUrl: string | null,
    onProgress: (message: string) => void,
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const requestPayload: any = {
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            config: {
                numberOfVideos: 1,
                resolution,
                aspectRatio,
            },
        };

        if (referenceImageUrl) {
            onProgress('Memproses gambar referensi...');
            const match = referenceImageUrl.match(/^data:(.+);base64,(.+)$/);
            if (!match) throw new Error("Format URL data gambar base64 tidak valid.");
            requestPayload.image = {
                imageBytes: match[2],
                mimeType: match[1],
            };
        }

        onProgress('Memulai pembuatan video...');
        let operation = await ai.models.generateVideos(requestPayload);

        onProgress('Video sedang dalam antrian... Ini bisa memakan waktu beberapa menit.');
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            onProgress('Memeriksa status video... Harap tetap di halaman ini.');
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        
        onProgress('Video selesai dirender! Mengunduh data...');
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Tidak ada tautan unduhan video yang ditemukan dalam respons API.");
        }

        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Gagal mengunduh video: ${videoResponse.statusText}`);
        }

        const videoBlob = await videoResponse.blob();
        onProgress('Video berhasil diunduh.');
        return URL.createObjectURL(videoBlob);
    } catch (error) {
        handleError(error, 'video generation');
    }
};


/**
 * Gets feedback on a given prompt to improve it for image generation.
 * @param prompt The user-generated prompt.
 * @returns A promise that resolves to a string containing AI-powered suggestions.
 */
export const getPromptFeedback = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze and provide feedback for this image prompt: "${prompt}"`,
        config: {
          systemInstruction: `You are a prompt engineering expert for generative AI image models. Your task is to analyze a user's prompt and provide constructive, concise, and actionable suggestions for improvement. 
- Focus on adding descriptive details (e.g., textures, materials, specific actions).
- Suggest specific lighting conditions (e.g., 'dramatic backlighting', 'soft morning light').
- Recommend improvements for composition (e.g., 'close-up shot', 'wide-angle view').
- Help clarify the artistic style if it's vague.
- Provide the feedback as a short, easy-to-read bulleted list.
- You MUST respond in Bahasa Indonesia.
- Keep the tone helpful and encouraging.`,
        },
      });
      return response.text;
    } catch (error) {
      handleError(error, 'getting prompt feedback');
    }
  };

/**
 * Generates creative prompt templates based on user's initial ideas.
 * @param context An object containing the current subject, style, and environment.
 * @returns A promise that resolves to an array of prompt suggestion strings.
 */
export const getSmartSuggestions = async (context: { subject: string, style: string, environment: string }): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const userPrompt = `Berdasarkan ide-ide berikut, hasilkan 3 prompt gambar yang lengkap, kreatif, dan detail:
- Subjek: "${context.subject}"
- Gaya: "${context.style}"
- Lingkungan: "${context.environment}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: `Anda adalah asisten kreatif untuk alat gambar AI generatif. Tugas Anda adalah mengembangkan ide-ide dasar pengguna dan menghasilkan 3 prompt yang berbeda, siap pakai, dan imajinatif.
- Setiap prompt harus berupa satu atau dua kalimat lengkap.
- Kembalikan saran sebagai daftar berpoin (menggunakan '*' atau '-').
- Jangan tambahkan teks pengantar atau penutup. Hanya daftar saja.
- Anda HARUS merespons dalam Bahasa Indonesia.`
            },
        });

        const suggestionsText = response.text;
        return suggestionsText.split('\n').map(s => s.replace(/^[*-]\s*/, '').trim()).filter(Boolean);
    } catch (error) {
        handleError(error, 'getting smart suggestions');
    }
};

/**
 * Generates a short dialogue script based on video context.
 * @param context An object containing the video subject, action, and a movement hint.
 * @returns A promise that resolves to a string containing the generated dialogue.
 */
export const generateDialogueScript = async (context: { subject: string, action: string, movement: string }): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const userPrompt = `Buatlah dialog singkat (1-2 kalimat) untuk sebuah adegan video berdasarkan konteks berikut:
- Subjek: "${context.subject}"
- Aksi: "${context.action}"
- Petunjuk Gerakan: "${context.movement}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction: `Anda adalah seorang penulis naskah film AI. Tugas Anda adalah menulis dialog yang singkat, kuat, dan relevan dengan konteks adegan yang diberikan.
- Dialog harus terasa alami untuk adegan tersebut.
- Jangan tambahkan label seperti "Dialog:" atau tanda kutip pembuka/penutup yang tidak perlu.
- Langsung berikan teks dialognya saja.
- Respons HARUS dalam Bahasa Indonesia.`
            },
        });
        return response.text.trim();
    } catch (error) {
        handleError(error, 'generating dialogue script');
    }
};


/**
 * Generates a structured JSON prompt for a video.
 * @param context An object containing video context and specific movement descriptions.
 * @returns A promise that resolves to a string containing the structured JSON prompt.
 */
export const generateJsonPrompt = async (context: {
    subject: string;
    action: string;
    videoConcept: string;
    hookMovement: string;
    problemMovement: string;
    ctaMovement: string;
    hookDialogue?: string;
    problemDialogue?: string;
    ctaDialogue?: string;
    dialogueStyle: string;
    dialogueLanguage: string;
    dialogueTempo: string;
}): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        let comedyInstruction = '';
        if (context.dialogueStyle === 'Comedy') {
            comedyInstruction = `
        **SPECIAL COMEDY INSTRUCTION:**
        When generating dialogue in the 'Comedy' style, you MUST adopt the persona of a sharp, witty Indonesian stand-up comedian. The humor must be:
        - **Observational & Relatable ("Ngena"):** Joke about everyday Indonesian life, social quirks, or common frustrations.
        - **Quirky & "Nyeleneh":** Use unexpected twists, absurd perspectives, or unique, funny comparisons.
        - **Clever, Not Cringey ("Tidak Garing"):** Avoid lazy puns. Aim for intelligent humor that is "enak didengar".
        - **Concise & Punchy:** Deliver the joke quickly. The dialogue must be short enough to fit comfortably within the 8-second scene.
        Think of top-tier Indonesian comics: smart, original, and straight to the point.
        `;
        }

        const userPrompt = `
Generate a valid JSON array containing exactly three JSON objects. Each object represents a complete, standalone scene prompt (Hook, Problem-Solve, CTA).

**Overall Context:**
- Video Concept: "${context.videoConcept}"
- Subject: "${context.subject}"
- Main Action: "${context.action}"

**CRITICAL INSTRUCTIONS FOR EACH JSON OBJECT:**
1.  **Structure:** Each of the three objects must strictly follow the provided JSON schema.
2.  **Character Consistency:** Invent a character and describe their 'appearance' in detail in the 'characters' array. This 'appearance' description MUST be identical across all three JSON objects to ensure visual continuity.
3.  **Unique Scenes (Hook, Problem-Solve, CTA):**
    - The first JSON object is the "Hook" scene, based on movement idea: "${context.hookMovement}". Its scene_number must be 1.
    - The second JSON object is the "Problem-Solve" scene, based on movement idea: "${context.problemMovement}". Its scene_number must be 2.
    - The third JSON object is the "CTA" scene, based on movement idea: "${context.ctaMovement}". Its scene_number must be 3.
4.  **STRICT TIMING & STEPS:** The 'steps' array MUST contain exactly three objects. Each object represents a visual action. The description for these steps MUST correspond to actions for a 3-second, 3-second, and 2-second duration, for a total of 8 seconds per scene.
5.  **Dialogue Generation Rules (HIGHEST PRIORITY):**
    - **Strict 8-Second Timing:** The 'dialogue' in the 'voice' object MUST be extremely concise and impactful. It must be comfortably speakable within the strict 8-second duration of the scene. Short, punchy lines are required.
    - **Engaging Style:** The dialogue MUST powerfully embody the selected '${context.dialogueStyle}' style. Do not be generic. 'Affiliate' style must be highly persuasive; 'Narrative' must be evocative and paint a picture; 'Conversational' must feel completely natural and unscripted. Make every word count.
    - **Language & Tempo:** The dialogue MUST be in ${context.dialogueLanguage} and have a '${context.dialogueTempo}' tempo.
    - **CTA Scene Special Rule:** For the third scene object (the CTA scene), the dialogue MUST be a strong, persuasive Call to Action. It should create a sense of urgency or FOMO (Fear Of Missing Out). Critically, this dialogue MUST incorporate the exact phrase "Klik keranjang kiri bawah". You can creatively place this phrase at the beginning, middle, or end of the sentence. For example: "Stok terbatas banget, Klik keranjang kiri bawah sekarang!" or "Klik keranjang kiri bawah sebelum kehabisan!".
    ${comedyInstruction}
    - **Manual Input:** Use the following manual dialogue as strong inspiration if provided:
      - Hook Scene Manual Dialogue: "${context.hookDialogue}"
      - Problem-Solve Scene Manual Dialogue: "${context.problemDialogue}"
      - CTA Scene Manual Dialogue: "${context.ctaDialogue}"
6.  **LANGUAGE RULES:** All JSON keys and all string values (like descriptions, titles, styles) MUST be in English. The ONLY exception is the 'dialogue' field inside the 'voice' object, which MUST be in ${context.dialogueLanguage}.
`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            video_title: { type: Type.STRING },
                            video_style: { type: Type.STRING },
                            characters: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        appearance: { type: Type.STRING }
                                    },
                                    required: ['name', 'appearance']
                                }
                            },
                            scenes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        scene_number: { type: Type.INTEGER },
                                        description: { type: Type.STRING },
                                        steps: {
                                            type: Type.ARRAY,
                                            items: { 
                                                type: Type.OBJECT,
                                                properties: {
                                                    step_number: { type: Type.INTEGER },
                                                    description: { type: Type.STRING }
                                                },
                                                required: ['step_number', 'description']
                                            }
                                        },
                                        audio: {
                                            type: Type.OBJECT,
                                            properties: {
                                                music: { type: Type.STRING },
                                                voice: {
                                                    type: Type.OBJECT,
                                                    properties: {
                                                        language: { type: Type.STRING },
                                                        tone: { type: Type.STRING },
                                                        dialogue: { type: Type.STRING }
                                                    },
                                                    required: ['language', 'tone', 'dialogue']
                                                }
                                            },
                                            required: ['music', 'voice']
                                        }
                                    },
                                    required: ['scene_number', 'description', 'steps', 'audio']
                                }
                            }
                        },
                        required: ['video_title', 'video_style', 'characters', 'scenes']
                    }
                },
            },
        });
        
        // The API sometimes returns the array wrapped in markdown, clean it up.
        let jsonText = response.text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.substring(7, jsonText.length - 3).trim();
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.substring(3, jsonText.length - 3).trim();
        }

        return jsonText;
    } catch (error) {
        handleError(error, 'generating JSON prompt');
    }
};

/**
 * Analyzes an image and suggests movements for a video.
 * @param base64ImageDataUrl The base64 data URL of the image to analyze.
 * @returns A promise that resolves to an object with movement suggestions.
 */
export const analyzeImageForMovement = async (base64ImageDataUrl: string): Promise<{
    mainAction: string;
    cameraMovement: string;
    hookMovement: string;
    problemMovement: string;
    ctaMovement: string;
}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const match = base64ImageDataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!match) {
            throw new Error("Format URL data gambar base64 tidak valid.");
        }
        const mimeType = match[1];
        const data = match[2];

        const imagePart = { inlineData: { mimeType, data } };
        const textPart = { text: `
Analisis gambar ini untuk konsep video promosi singkat. 
Berdasarkan subjek, latar, dan suasana gambar, sarankan:
1. Aksi utama yang bisa dilakukan subjek.
2. Gerakan kamera yang cocok.
3. Konsep video 3 langkah (Hook, Problem-Solve, CTA) yang menarik.

Penting:
- Semua respons teks HARUS dalam Bahasa Indonesia.
- Berikan respons HANYA sebagai objek JSON yang valid.
` };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mainAction: { type: Type.STRING, description: "Aksi atau gerakan utama yang dilakukan subjek dalam video." },
                        cameraMovement: { type: Type.STRING, description: "Gerakan kamera yang disarankan untuk video." },
                        hookMovement: { type: Type.STRING, description: "Deskripsi gerakan untuk bagian Hook (pancingan)." },
                        problemMovement: { type: Type.STRING, description: "Deskripsi gerakan untuk bagian Problem-Solve (solusi)." },
                        ctaMovement: { type: Type.STRING, description: "Deskripsi gerakan untuk bagian Call to Action (ajakan bertindak)." },
                    },
                    required: ["mainAction", "cameraMovement", "hookMovement", "problemMovement", "ctaMovement"]
                },
            },
        });
        
        const parsedJson = JSON.parse(response.text);
        return parsedJson;

    } catch (error) {
        handleError(error, 'menganalisis gerakan gambar');
    }
};

/**
 * Generates a single image from a text prompt using the 'imagen-4.0-generate-001' model.
 * @param prompt The text prompt describing the image to generate.
 * @param aspectRatio The desired aspect ratio for the image.
 * @returns A promise that resolves to a base64 data URL of the generated image.
 */
export const generateSingleImage = async (prompt: string, aspectRatio: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
        },
    });

    const image = response.generatedImages?.[0];
    const base64ImageBytes = image?.image?.imageBytes;

    if (!base64ImageBytes) {
        throw new Error("API tidak menghasilkan gambar. Ini mungkin karena pemicu filter keamanan. Coba sesuaikan prompt Anda.");
    }
    
    return `data:image/jpeg;base64,${base64ImageBytes}`;

  } catch (error) {
    handleError(error, 'single image generation from text');
  }
};