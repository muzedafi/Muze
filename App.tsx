import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateImageFromText, editImageWithPrompt, getPromptFeedback, getSmartSuggestions, generateVideoFromPrompt, generateDialogueScript, generateJsonPrompt, analyzeImageForMovement, generateSingleImage } from './services/geminiService';
import { ART_STYLES, COLOR_PALETTES, ASPECT_RATIOS, ENVIRONMENT_OPTIONS, RESOLUTION_OPTIONS, BLUR_OPTIONS, CAMERA_ANGLES, LIGHTING_STYLES, TIME_OPTIONS, VIDEO_STYLES, CAMERA_MOVEMENTS, VIDEO_RESOLUTIONS, VIDEO_LANGUAGES, VOICE_GENDERS, SPEAKING_STYLES, VIDEO_MOODS, MOVEMENT_OPTIONS, STRUCTURED_PROMPT_TEXTS, DIALOGUE_STYLES, DIALOGUE_TEMPOS, VIDEO_CONCEPTS } from './constants';
import DnaInputSection from './components/DnaInputSection';
import SelectableTags from './components/SelectableTags';
import ImageDisplay from './components/ImageDisplay';


/**
 * Processes a base64 image URL to fit a target aspect ratio by center-cropping it.
 * @param base64Url The original image data URL.
 * @param targetAspectRatioString The desired aspect ratio (e.g., "16:9").
 * @returns A promise that resolves with the new cropped image data URL.
 */
const processImageToAspectRatio = (
  base64Url: string,
  targetAspectRatioString: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const aspectRatioMap: { [key: string]: number } = {
      '1:1': 1 / 1, '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '3:4': 3 / 4,
    };
    const targetRatio = aspectRatioMap[targetAspectRatioString];

    if (!targetRatio) {
      console.warn('Invalid aspect ratio string, returning original image.');
      return resolve(base64Url);
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get canvas context.'));

      const originalWidth = img.width;
      const originalHeight = img.height;
      const originalRatio = originalWidth / originalHeight;

      let sx = 0, sy = 0, sWidth = originalWidth, sHeight = originalHeight;

      if (targetRatio > originalRatio) {
        sHeight = originalWidth / targetRatio;
        sy = (originalHeight - sHeight) / 2;
      } else if (targetRatio < originalRatio) {
        sWidth = originalHeight * targetRatio;
        sx = (originalWidth - sWidth) / 2;
      }

      canvas.width = sWidth;
      canvas.height = sHeight;
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      
      const mimeType = base64Url.match(/^data:(image\/.+);base64,/)?.[1] || 'image/jpeg';
      resolve(canvas.toDataURL(mimeType));
    };
    img.onerror = (err) => reject(new Error('Failed to load image for aspect ratio processing.'));
    img.src = base64Url;
  });
};


const App: React.FC = () => {
  // --- API Key State ---
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);

  // Mode State
  const [generatorMode, setGeneratorMode] = useState<'product' | 'video'>('product');
  const [isFading, setIsFading] = useState(false);
  
  // --- IMAGE DNA States ---
  const [subject, setSubject] = useState<string>('Wanita muda Indonesia yang cantik');
  const [style, setStyle] = useState<string>('Photorealistic');
  const [environment, setEnvironment] = useState<string>('Ruangan estetis dengan lampu LED');
  const [customEnvironment, setCustomEnvironment] = useState<string>('');
  const [environmentDetails, setEnvironmentDetails] = useState<string>('');
  const [palette, setPalette] = useState<string>('Earthy Tones');
  const [details, setDetails] = useState<string>('memakai tas, dengan senyum ceria');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [resolution, setResolution] = useState<string>('8K');
  const [backgroundBlur, setBackgroundBlur] = useState<string>('Tidak ada');
  const [cameraAngle, setCameraAngle] = useState<string>('Tangkapan Sejajar Mata');
  const [lightingStyle, setLightingStyle] = useState<string>('Cahaya Latar');
  const [timeOfDay, setTimeOfDay] = useState<string>('Siang Hari');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [removeBackground, setRemoveBackground] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [artStyleFilter, setArtStyleFilter] = useState<string>('');

  // --- VIDEO DNA States ---
  const [videoUploadedImage, setVideoUploadedImage] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [videoConcept, setVideoConcept] = useState<string>('Afiliasi');
  const [customVideoConcept, setCustomVideoConcept] = useState<string>('');
  const [videoSubject, setVideoSubject] = useState<string>('');
  const [videoAction, setVideoAction] = useState<string>('');
  const [videoStyle, setVideoStyle] = useState<string>('Sinematik');
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>('16:9');
  const [videoResolution, setVideoResolution] = useState<string>('1080p');
  const [videoEnvironment, setVideoEnvironment] = useState<string>('Pemandangan alam pegunungan yang megah');
  const [videoTimeOfDay, setVideoTimeOfDay] = useState<string>('Golden Hour');
  const [cameraMovement, setCameraMovement] = useState<string>('Tangkapan pelacakan lambat');
  const [videoLightingStyle, setVideoLightingStyle] = useState<string>('Golden Hour');
  const [videoPalette, setVideoPalette] = useState<string>('Golden Hour Hues');
  const [videoDetails, setVideoDetails] = useState<string>('dengan sinar matahari yang menyinari sayapnya');
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(false);
  const [soundLanguage, setSoundLanguage] = useState<string>(VIDEO_LANGUAGES[0]);
  const [voiceGender, setVoiceGender] = useState<string>(VOICE_GENDERS[0]);
  const [speakingStyle, setSpeakingStyle] = useState<string>(SPEAKING_STYLES[0]);
  const [videoMood, setVideoMood] = useState<string>(VIDEO_MOODS[0]);
  const [isDialogueEnabled, setIsDialogueEnabled] = useState<boolean>(false);
  const [dialogueText, setDialogueText] = useState<string>('');
  const [isDialogueLoading, setIsDialogueLoading] = useState<boolean>(false);
  const [dialogueError, setDialogueError] = useState<string | null>(null);
  
  // --- Structured JSON Prompt States ---
  const [parsedJsonPrompt, setParsedJsonPrompt] = useState<any[] | null>(null);
  const [isJsonLoading, setIsJsonLoading] = useState<boolean>(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);
  const [jsonPromptLanguage, setJsonPromptLanguage] = useState<'en' | 'id'>('en');
  
  const [hookMovement, setHookMovement] = useState<string>(MOVEMENT_OPTIONS.en[0].value);
  const [problemMovement, setProblemMovement] = useState<string>(MOVEMENT_OPTIONS.en[1].value);
  const [ctaMovement, setCtaMovement] = useState<string>(MOVEMENT_OPTIONS.en[2].value);
  
  const [customHookMovement, setCustomHookMovement] = useState<string>('');
  const [customProblemMovement, setCustomProblemMovement] = useState<string>('');
  const [customCtaMovement, setCustomCtaMovement] = useState<string>('');

  const [hookDialogue, setHookDialogue] = useState<string>('');
  const [problemDialogue, setProblemDialogue] = useState<string>('');
  const [ctaDialogue, setCtaDialogue] = useState<string>('');
  
  const [dialogueStyle, setDialogueStyle] = useState<string>('Affiliate');
  const [dialogueLanguage, setDialogueLanguage] = useState<string>(VIDEO_LANGUAGES[0]);
  const [dialogueTempo, setDialogueTempo] = useState<string>(DIALOGUE_TEMPOS.en[1].value);

  // --- Movement Analysis States ---
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // --- States for Images Generated from JSON ---
  const [jsonGeneratedImages, setJsonGeneratedImages] = useState<string[] | null>(null);
  const [isJsonImageLoading, setIsJsonImageLoading] = useState<boolean>(false);
  const [jsonImageError, setJsonImageError] = useState<string | null>(null);


  // --- IMAGE Generation States ---
  const [finalPrompt, setFinalPrompt] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- VIDEO Generation States ---
  const [finalVideoPrompt, setFinalVideoPrompt] = useState<string>('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState<string>('');
  const [videoError, setVideoError] = useState<string | null>(null);


  // AI Feedback States
  const [promptFeedback, setPromptFeedback] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Smart Suggestions State
  const [smartSuggestions, setSmartSuggestions] = useState<string[] | null>(null);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  
  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      }
    };
    checkApiKey();
  }, []);


  // Effect to process uploaded image when it or the aspect ratio changes
  useEffect(() => {
    if (uploadedImage) {
        processImageToAspectRatio(uploadedImage, aspectRatio)
            .then(processedDataUrl => {
                setProcessedImage(processedDataUrl);
            })
            .catch(error => {
                console.error("Gagal memproses gambar:", error);
                setProcessedImage(uploadedImage); // Fallback to original on error
            });
    } else {
        setProcessedImage(null);
    }
  }, [uploadedImage, aspectRatio]);

  // Construct Image Prompt
  useEffect(() => {
    if (generatorMode !== 'product') return;
    const constructPrompt = () => {
      let promptBody = `Sebuah penggambaran ${style} dari ${subject}`;
      if (details) {
        promptBody += `, ${details}`;
      }
      
      let baseEnv = '';
      if (environment === 'Lingkungan Kustom...') {
          baseEnv = customEnvironment.trim();
      } else {
          baseEnv = environment.trim();
      }

      const finalEnvironment = [baseEnv, environmentDetails.trim()].filter(Boolean).join(', ');

      if (finalEnvironment) {
        promptBody += `, di ${finalEnvironment}`;
      }
      
      if (timeOfDay) {
        promptBody += ` pada ${timeOfDay}`;
      }
      if (cameraAngle) {
        promptBody += `, sudut pandang ${cameraAngle}`;
      }
      if (lightingStyle) {
          promptBody += `, diterangi oleh ${lightingStyle}`;
      }
      let blurDetails = '';
      switch (backgroundBlur) {
          case 'Rendah':
              blurDetails = 'dengan latar belakang buram intensitas 20% (bokeh ringan)';
              break;
          case 'Sedang':
              blurDetails = 'dengan latar belakang buram intensitas 75% (bokeh sedang)';
              break;
          case 'Tinggi':
              blurDetails = 'dengan latar belakang sangat buram (bokeh kuat)';
              break;
      }
      if (blurDetails) {
          promptBody += `, ${blurDetails}`;
      }
      if (palette) {
        promptBody += `, dengan palet warna ${palette}`;
      }
      // Only add aspect ratio to prompt for new generations, as it's handled by cropping for edits.
      if (aspectRatio && !uploadedImage) {
          promptBody += `, dalam rasio aspek ${aspectRatio}`;
      }
      let resolutionDetails = '';
      switch (resolution) {
          case 'HD':
              resolutionDetails = 'resolusi tinggi, sangat detail';
              break;
          case '4K':
              resolutionDetails = 'kualitas 4K, sangat detail, fotorealistis';
              break;
          case '8K':
              resolutionDetails = 'kualitas 8K, resolusi sangat tinggi, pencahayaan sinematik, sangat detail';
              break;
      }
      promptBody += `. ${resolutionDetails}.`;

      if (uploadedImage && removeBackground) {
        setFinalPrompt(`Hapus total latar belakang dari gambar ini, buat menjadi transparan, dan fokus hanya pada subjek utama. Setelah itu, terapkan deskripsi berikut ke subjek: ${promptBody}`);
      } else {
        setFinalPrompt(promptBody);
      }
    };
    constructPrompt();
  }, [subject, style, environment, customEnvironment, environmentDetails, palette, details, uploadedImage, resolution, backgroundBlur, cameraAngle, lightingStyle, timeOfDay, generatorMode, removeBackground, aspectRatio]);

  // Construct Video Prompt
  useEffect(() => {
    if (generatorMode !== 'video') return;
    const constructVideoPrompt = () => {
      let prompt = `Sebuah video ${videoStyle} dari ${videoSubject}, ${videoAction}`;

      if (videoEnvironment) {
        prompt += `, diatur dalam ${videoEnvironment}`;
      }
      if (videoTimeOfDay) {
        prompt += ` selama ${videoTimeOfDay}`;
      }
      if (cameraMovement) {
        prompt += `, difilmkan dengan ${cameraMovement}`;
      }
      if (videoLightingStyle) {
        prompt += `, dengan ${videoLightingStyle}`;
      }
      if (videoPalette) {
        prompt += `, menampilkan palet warna ${videoPalette}`;
      }
      if (videoDetails) {
        prompt += `, ${videoDetails}`;
      }
      if (isSoundEnabled) {
          prompt += `. Sertakan narasi audio dalam ${soundLanguage} dengan suara ${voiceGender} bergaya ${speakingStyle} untuk menyampaikan suasana ${videoMood}.`;
      }
      if (isDialogueEnabled && dialogueText.trim()) {
        prompt += `. Termasuk dialog berikut: "${dialogueText}"`;
      }

      prompt += ` Resolusi ${videoResolution}, rasio aspek ${videoAspectRatio}.`;
      setFinalVideoPrompt(prompt);
    };
    constructVideoPrompt();
  }, [videoSubject, videoAction, videoStyle, videoEnvironment, videoTimeOfDay, cameraMovement, videoLightingStyle, videoPalette, videoDetails, videoResolution, videoAspectRatio, generatorMode, isSoundEnabled, soundLanguage, voiceGender, speakingStyle, videoMood, isDialogueEnabled, dialogueText]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setRemoveBackground(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeVideoUploadedImage = () => {
    setVideoUploadedImage(null);
    if(videoFileInputRef.current) {
        videoFileInputRef.current.value = "";
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setIsApiKeySelected(true); // Optimistically assume success
    }
  };

  const handleApiError = (err: unknown, errorSetter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.';
    if (errorMessage.includes('Requested entity was not found')) {
        errorSetter('Otorisasi gagal. Silakan pilih kembali Kunci API Anda.');
        setIsApiKeySelected(false); // Force re-selection
    } else {
        errorSetter(errorMessage);
    }
    console.error(err);
  }

  const handleGenerateImage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);
    try {
      let imageUrls: string[];
      // Use the pre-processed (cropped) image for editing
      if (processedImage && uploadedImage) {
        const posePrompts = [
            'dalam pose berdiri seluruh badan',
            'dalam pose duduk santai',
            'dalam pose berjalan, menghadap kamera',
            'sebagai foto potret close-up'
        ];
        
        const generatedUrls: string[] = [];
        for (const pose of posePrompts) {
            const fullPrompt = `Gunakan gambar referensi ini sebagai panduan visual utama. Pertahankan konsistensi pada penampilan subjek, pakaian, produk, dan latar belakang yang ada di gambar referensi. Terapkan prompt berikut: "${finalPrompt}". Fokus utama perubahan adalah untuk menyesuaikan pose subjek menjadi: ${pose}. Hindari perubahan drastis pada elemen-elemen penting lainnya.`;
            const imageUrl = await editImageWithPrompt(fullPrompt, processedImage);
            generatedUrls.push(imageUrl);
        }
        imageUrls = generatedUrls;

      } else {
        // Generate 4 variations with consistent background, clothing, and product
        const posePrompts = [
            'dalam pose berdiri seluruh badan, menghadap kamera',
            'dalam pose duduk santai di elemen yang ada di lingkungan tersebut (misal: kursi, tangga, batu)',
            'diambil dari sudut rendah, menampilkan subjek secara keseluruhan dengan latar yang megah',
            'sebagai foto potret close-up, fokus pada ekspresi wajah'
        ];

        const generatedUrls: string[] = [];
        for (const pose of posePrompts) {
            // Stricter prompt for new generation, emphasizing consistency
            const fullPrompt = `${finalPrompt}. INSTRUKSI PENTING: Latar belakang, pakaian model, dan produk apa pun yang dipegang atau ditampilkan harus TETAP SAMA di semua gambar. Jangan mengubahnya. Satu-satunya variasi yang diizinkan adalah pose subjek dan sudut kamera. Untuk gambar ini, gunakan pose berikut: ${pose}.`;
            const imageUrl = await generateSingleImage(fullPrompt, aspectRatio as any);
            generatedUrls.push(imageUrl);
        }
        imageUrls = generatedUrls;
      }
      setGeneratedImages(imageUrls);
    } catch (err) {
      handleApiError(err, setError);
    } finally {
      setIsLoading(false);
    }
  }, [finalPrompt, uploadedImage, processedImage, aspectRatio]);

  const handleGenerateVideo = useCallback(async () => {
    setIsVideoLoading(true);
    setVideoError(null);
    setGeneratedVideo(null);
    setVideoLoadingMessage('Mempersiapkan pembuatan video...');
    try {
        const videoUrl = await generateVideoFromPrompt(
            finalVideoPrompt,
            videoAspectRatio as '16:9' | '9:16',
            videoResolution as '720p' | '1080p',
            videoUploadedImage,
            (message) => setVideoLoadingMessage(message)
        );
        setGeneratedVideo(videoUrl);
    } catch (err) {
        handleApiError(err, setVideoError);
    } finally {
        setIsVideoLoading(false);
        setVideoLoadingMessage('');
    }
  }, [finalVideoPrompt, videoAspectRatio, videoResolution, videoUploadedImage]);

  const handleGetFeedback = useCallback(async () => {
    setIsFeedbackLoading(true);
    setFeedbackError(null);
    setPromptFeedback(null);
    const currentPrompt = generatorMode === 'product' ? finalPrompt : finalVideoPrompt;
    try {
        const feedback = await getPromptFeedback(currentPrompt);
        setPromptFeedback(feedback);
    } catch (err) {
        handleApiError(err, setFeedbackError);
    } finally {
        setIsFeedbackLoading(false);
    }
  }, [finalPrompt, finalVideoPrompt, generatorMode]);

  const handleGetSmartSuggestions = useCallback(async () => {
    setIsSuggestionsLoading(true);
    setSuggestionsError(null);
    setSmartSuggestions(null);
    try {
        const suggestions = await getSmartSuggestions({ subject, style, environment });
        setSmartSuggestions(suggestions);
    } catch (err) {
        handleApiError(err, setSuggestionsError);
    } finally {
        setIsSuggestionsLoading(false);
    }
  }, [subject, style, environment]);
  
  const handleGenerateDialogue = useCallback(async (movement: string) => {
    setIsDialogueLoading(true);
    setDialogueError(null);
    try {
        const generatedDialogue = await generateDialogueScript({
            subject: videoSubject,
            action: videoAction,
            movement: movement,
        });
        setDialogueText(generatedDialogue);
    } catch (err) {
        handleApiError(err, setDialogueError);
    } finally {
        setIsDialogueLoading(false);
    }
  }, [videoSubject, videoAction]);
  
  const handleGenerateJsonPrompt = useCallback(async () => {
    setIsJsonLoading(true);
    setJsonError(null);
    setParsedJsonPrompt(null);
    setCopiedBlock(null);
    setJsonGeneratedImages(null);
    setJsonImageError(null);

    const hook = hookMovement === 'Custom' ? customHookMovement : hookMovement;
    const problem = problemMovement === 'Custom' ? customProblemMovement : problemMovement;
    const cta = ctaMovement === 'Custom' ? customCtaMovement : ctaMovement;
    const finalConcept = videoConcept === 'Kustom...' ? customVideoConcept : videoConcept;

    if ((hookMovement === 'Custom' && !customHookMovement.trim()) || 
        (problemMovement === 'Custom' && !customProblemMovement.trim()) || 
        (ctaMovement === 'Custom' && !customCtaMovement.trim()) ||
        (videoConcept === 'Kustom...' && !customVideoConcept.trim())) {
        setJsonError(STRUCTURED_PROMPT_TEXTS[jsonPromptLanguage].error);
        setIsJsonLoading(false);
        return;
    }

    try {
        const jsonString = await generateJsonPrompt({
            subject: videoSubject,
            action: videoAction,
            videoConcept: finalConcept,
            hookMovement: hook,
            problemMovement: problem,
            ctaMovement: cta,
            hookDialogue,
            problemDialogue,
            ctaDialogue,
            dialogueStyle,
            dialogueLanguage,
            dialogueTempo,
        });
        const parsedJson = JSON.parse(jsonString);
        setParsedJsonPrompt(parsedJson);

        // --- Auto-generate images after JSON is successfully created ---
        setIsJsonImageLoading(true);
        try {
            const imagePrompts = parsedJson.map((sceneData: any) => {
                const character = sceneData.characters?.[0]?.appearance || videoSubject;
                const scene = sceneData.scenes?.[0];
                if (!scene) return '';
                const sceneDesc = scene.description;
                const stepsDesc = scene.steps?.map((s: any) => s.description).join(', ');
                const style = sceneData.video_style || videoStyle;
                return `A ${style} visual of ${character}. Scene description: ${sceneDesc}. Key actions: ${stepsDesc}.`;
            }).filter(Boolean);

            if (imagePrompts.length < 1) { // Can be 1, 2, or 3 scenes
                throw new Error("Gagal membuat prompt gambar dari JSON yang dihasilkan.");
            }
            
            const imagePromises = imagePrompts.map(prompt =>
                generateSingleImage(prompt, videoAspectRatio as any)
            );
            const generatedUrls = await Promise.all(imagePromises);
            setJsonGeneratedImages(generatedUrls);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat gambar dari JSON.';
            setJsonImageError(errorMessage);
        } finally {
            setIsJsonImageLoading(false);
        }
        // --- End of auto-image generation ---

    } catch (err) {
        handleApiError(err, setJsonError);
    } finally {
        setIsJsonLoading(false);
    }
  }, [
    videoSubject, 
    videoAction, 
    jsonPromptLanguage,
    videoConcept,
    customVideoConcept,
    hookMovement, 
    problemMovement, 
    ctaMovement, 
    customHookMovement, 
    customProblemMovement, 
    customCtaMovement,
    hookDialogue,
    problemDialogue,
    ctaDialogue,
    dialogueStyle,
    dialogueLanguage,
    dialogueTempo,
    videoStyle,
    videoAspectRatio,
  ]);
  
  const handleAnalyzeMovement = useCallback(async () => {
    if (!videoUploadedImage) return;
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    try {
        const analysis = await analyzeImageForMovement(videoUploadedImage);
        setVideoAction(analysis.mainAction);
        setCameraMovement(analysis.cameraMovement);
        
        setHookMovement('Custom');
        setCustomHookMovement(analysis.hookMovement);
        
        setProblemMovement('Custom');
        setCustomProblemMovement(analysis.problemMovement);

        setCtaMovement('Custom');
        setCustomCtaMovement(analysis.ctaMovement);

    } catch (err) {
        handleApiError(err, setAnalysisError);
    } finally {
        setIsAnalysisLoading(false);
    }
  }, [videoUploadedImage]);

  const handleCopyBlock = (blockContent: any, blockIndex: number) => {
      const jsonString = JSON.stringify(blockContent, null, 2);
      navigator.clipboard.writeText(jsonString).then(() => {
          setCopiedBlock(blockIndex);
          setTimeout(() => setCopiedBlock(null), 2000);
      });
  };
  
  const handleUseImageForVideo = (imageUrl: string) => {
    handleModeChange('video');
    setVideoUploadedImage(imageUrl);
    window.scrollTo(0, 0); // Scroll to top for better UX
  };

  const handleModeChange = (newMode: 'product' | 'video') => {
    if (generatorMode === newMode) return;
    setIsFading(true);
    setTimeout(() => {
      setGeneratorMode(newMode);
      setIsFading(false);
    }, 200); // Match tailwind duration-200
  };

  const JsonBlock: React.FC<{ title: string, data: any, blockIndex: number }> = ({ title, data, blockIndex }) => {
    const currentTexts = STRUCTURED_PROMPT_TEXTS[jsonPromptLanguage];
    if (!data) return null;
    return (
        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg relative">
            <h5 className="text-md font-semibold text-gray-300 mb-2">{title}</h5>
            <button
                onClick={() => handleCopyBlock(data, blockIndex)}
                className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
                {copiedBlock === blockIndex ? currentTexts.copiedButton : currentTexts.copyButton}
            </button>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words font-mono">
                <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
        </div>
    );
  };

  const isEditing = !!uploadedImage;
  const isCustomEnvironment = environment === 'Lingkungan Kustom...';

  const filteredArtStyles = ART_STYLES.filter(style => 
    style.toLowerCase().includes(artStyleFilter.toLowerCase())
  );
  
  const renderProductGenerator = () => (
    <>
      <DnaInputSection title="Gambar Referensi" description="Unggah gambar untuk diedit atau diubah gayanya.">
        {uploadedImage ? (
          <div className="flex flex-col gap-4">
              <img src={uploadedImage} alt="Pratinjau yang diunggah" className="w-full max-w-2xl mx-auto rounded-lg border-2 border-gray-600" />
              <div className="flex items-center justify-between gap-4">
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                      <label htmlFor="remove-bg-toggle" className="flex items-center gap-3 cursor-pointer text-sm text-gray-300">
                          <input
                              type="checkbox"
                              id="remove-bg-toggle"
                              checked={removeBackground}
                              onChange={(e) => setRemoveBackground(e.target.checked)}
                              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                          />
                          <span>Hapus Background</span>
                      </label>
                  </div>
                  <button 
                      onClick={removeUploadedImage}
                      className="px-4 py-2 bg-red-600/50 text-white rounded-lg hover:bg-red-600/80 transition"
                  >
                      Hapus
                  </button>
              </div>
          </div>
        ) : (
          <>
            <label htmlFor="file-upload" className="w-full text-center cursor-pointer bg-gray-700 text-white rounded-md p-3 border border-gray-600 hover:bg-gray-600 transition">
              Klik untuk Mengunggah Gambar
            </label>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </>
        )}
      </DnaInputSection>

      <DnaInputSection title="Kualitas & Dimensi" description="Tentukan tingkat detail dan rasio aspek.">
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="text-md font-medium text-gray-300 mb-2">Kualitas Resolusi</h3>
                <SelectableTags options={RESOLUTION_OPTIONS} selected={resolution} onSelect={setResolution} />
            </div>
            <div>
                <h3 className="text-md font-medium text-gray-300 mb-2">Rasio Aspek</h3>
                <SelectableTags options={ASPECT_RATIOS} selected={aspectRatio} onSelect={setAspectRatio} />
                {isEditing && (
                    <p className="text-xs text-gray-400 mt-2">
                        Gambar akan dipotong agar sesuai dengan rasio aspek.
                    </p>
                )}
            </div>
        </div>
      </DnaInputSection>

      <DnaInputSection title={isEditing ? "Apa yang Ingin Ditambah/Diubah" : "Subjek Inti"} description={isEditing ? "Jelaskan modifikasi untuk gambar." : "Karakter atau objek utama."}>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={isEditing ? "contoh: naga kecil di bahunya" : "contoh: robot krom futuristik"}
          className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        />
      </DnaInputSection>

      <DnaInputSection title="Pengubah & Detail" description="Tambahkan fitur spesifik.">
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="contoh: memegang bola bercahaya"
          rows={2}
          className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        />
      </DnaInputSection>

      <DnaInputSection title="Lingkungan / Latar" description="Pilih atau jelaskan latar.">
        <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        >
            {ENVIRONMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
        {isCustomEnvironment && (
            <input
                type="text"
                value={customEnvironment}
                onChange={(e) => setCustomEnvironment(e.target.value)}
                placeholder="Tulis lingkungan kustom utama di sini..."
                className="w-full mt-4 bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            />
        )}
        <input
          type="text"
          value={environmentDetails}
          onChange={(e) => setEnvironmentDetails(e.target.value)}
          placeholder="Detail tambahan untuk lingkungan..."
          className="w-full mt-4 bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        />
      </DnaInputSection>

      <DnaInputSection title="Gaya Seni" description="Tentukan estetika visual.">
        <input
          type="text"
          value={artStyleFilter}
          onChange={(e) => setArtStyleFilter(e.target.value)}
          placeholder="Filter gaya..."
          className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition mb-4"
        />
        <SelectableTags options={filteredArtStyles} selected={style} onSelect={setStyle} />
      </DnaInputSection>

      <DnaInputSection title="Waktu" description="Pilih waktu hari.">
          <SelectableTags options={TIME_OPTIONS} selected={timeOfDay} onSelect={setTimeOfDay} />
      </DnaInputSection>
      
      <DnaInputSection title="Pencahayaan" description="Pilih gaya pencahayaan.">
          <SelectableTags options={LIGHTING_STYLES} selected={lightingStyle} onSelect={setLightingStyle} />
      </DnaInputSection>

      <DnaInputSection title="Sudut Kamera" description="Pilih sudut pandang.">
          <input
            type="text"
            value={cameraAngle}
            onChange={(e) => setCameraAngle(e.target.value)}
            placeholder="Atau ketik sudut kustom..."
            className="w-full mb-4 bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          />
          <SelectableTags options={CAMERA_ANGLES} selected={cameraAngle} onSelect={setCameraAngle} />
      </DnaInputSection>
      
      <DnaInputSection title="Efek Buram" description="Tambahkan kedalaman.">
        <SelectableTags options={BLUR_OPTIONS} selected={backgroundBlur} onSelect={setBackgroundBlur} />
      </DnaInputSection>

      <DnaInputSection title="Palet Warna" description="Pilih skema warna.">
        <input
          type="text"
          value={palette}
          onChange={(e) => setPalette(e.target.value)}
          placeholder="Atau ketik palet kustom..."
          className="w-full mb-4 bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        />
        <SelectableTags options={COLOR_PALETTES} selected={palette} onSelect={setPalette} />
      </DnaInputSection>

      <DnaInputSection title="Prompt Cerdas" description="Dapatkan ide prompt dari AI.">
        <button
          onClick={handleGetSmartSuggestions}
          disabled={isSuggestionsLoading}
          className="w-full py-2 px-4 text-md font-semibold text-white rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
        >
          {isSuggestionsLoading ? 'Mencari Ide...' : 'Hasilkan Prompt Cerdas'}
        </button>
        {suggestionsError && <p className="text-red-400 text-sm mt-2">{suggestionsError}</p>}
        {smartSuggestions && (
          <div className="flex flex-col gap-2 mt-2">
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setSubject(suggestion);
                  setDetails('');
                }}
                className="text-left p-3 bg-gray-900/50 rounded-md text-sm text-gray-300 hover:bg-gray-700/80 transition cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </DnaInputSection>
      
       {(isFeedbackLoading || feedbackError || promptFeedback) && (
        <DnaInputSection title="Saran AI" description="Saran untuk menyempurnakan prompt.">
            {isFeedbackLoading && <p className="text-gray-400">Menganalisis...</p>}
            {feedbackError && <p className="text-red-400 text-sm">{feedbackError}</p>}
            {promptFeedback && (
                <div className="text-gray-300 bg-gray-900/50 p-4 rounded-md text-sm whitespace-pre-wrap font-mono">
                    {promptFeedback}
                </div>
            )}
        </DnaInputSection>
      )}
      
      <div className="flex flex-col gap-2 pt-6 border-t border-gray-700">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">Prompt Final</h2>
            <button
                onClick={handleGetFeedback}
                disabled={isFeedbackLoading || !finalPrompt.trim()}
                className="text-xs px-3 py-1 bg-cyan-600/50 text-white rounded-full hover:bg-cyan-600/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isFeedbackLoading ? 'Menganalisis...' : 'Dapatkan Saran AI'}
            </button>
        </div>
        <p className="text-sm text-gray-400">Ini adalah prompt yang dikirim ke AI.</p>
        <p className="text-gray-400 bg-gray-900/50 p-4 rounded-md text-sm leading-relaxed min-h-[100px]">
            {finalPrompt}
        </p>
      </div>

       <button
        onClick={handleGenerateImage}
        disabled={isLoading || !finalPrompt.trim()}
        className="w-full py-3 px-6 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-500/50 transform hover:scale-105"
      >
        {isLoading ? (isEditing ? 'Menerapkan...' : 'Menghasilkan...') : (isEditing ? 'Hasilkan Ulang' : 'Hasilkan Gambar')}
      </button>

      {/* Image Output Section */}
      <div className={`mt-6 ${!(isLoading || generatedImages || error) ? 'invisible' : ''}`}>
        <ImageDisplay 
          generatedImages={generatedImages}
          isLoading={isLoading}
          error={error}
          aspectRatio={aspectRatio}
          onUseForVideo={handleUseImageForVideo}
        />
      </div>
    </>
  );

  const renderVideoGenerator = () => {
    const currentMovementOptions = MOVEMENT_OPTIONS[jsonPromptLanguage] || MOVEMENT_OPTIONS.en;
    const currentDialogueStyles = DIALOGUE_STYLES[jsonPromptLanguage] || DIALOGUE_STYLES.en;
    const currentDialogueTempos = DIALOGUE_TEMPOS[jsonPromptLanguage] || DIALOGUE_TEMPOS.en;
    const currentTexts = STRUCTURED_PROMPT_TEXTS[jsonPromptLanguage];

    const MovementSelector: React.FC<{
        label: string;
        value: string;
        onChange: (v: string) => void;
        customValue: string;
        onCustomChange: (v: string) => void;
        dialogueValue: string;
        onDialogueChange: (v: string) => void;
    }> = ({ label, value, onChange, customValue, onCustomChange, dialogueValue, onDialogueChange }) => (
        <div className="flex flex-col gap-3">
            <h4 className="text-md font-medium text-gray-300">{label}</h4>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            >
                {currentMovementOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {value === 'Custom' && (
                <input
                    type="text"
                    value={customValue}
                    onChange={(e) => onCustomChange(e.target.value)}
                    placeholder={currentTexts.customPlaceholder}
                    className="w-full bg-gray-800 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                />
            )}
            <textarea
                value={dialogueValue}
                onChange={(e) => onDialogueChange(e.target.value)}
                placeholder={currentTexts.dialoguePlaceholder}
                rows={2}
                className="w-full bg-gray-800 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            />
        </div>
    );

    return (
    <>
      <DnaInputSection title="Aset Referensi (Opsional)" description="Unggah gambar untuk memandu pembuatan video.">
        {videoUploadedImage ? (
          <div className="flex flex-col gap-4">
              <img src={videoUploadedImage} alt="Pratinjau Video yang diunggah" className="w-full max-w-2xl mx-auto rounded-lg border-2 border-gray-600" />
              <div className="flex justify-between gap-4">
                  <button 
                      onClick={handleAnalyzeMovement}
                      disabled={isAnalysisLoading}
                      className="flex-grow px-4 py-2 bg-cyan-600/50 text-white rounded-lg hover:bg-cyan-600/80 transition disabled:opacity-50"
                  >
                      {isAnalysisLoading ? 'Menganalisis...' : 'Analisis Gambar untuk Gerakan'}
                  </button>
                  <button 
                      onClick={removeVideoUploadedImage}
                      className="px-4 py-2 bg-red-600/50 text-white rounded-lg hover:bg-red-600/80 transition"
                  >
                      Hapus
                  </button>
              </div>
              {analysisError && <p className="text-red-400 text-sm mt-2">{analysisError}</p>}
          </div>
        ) : (
          <>
            <label htmlFor="video-file-upload" className="w-full text-center cursor-pointer bg-gray-700 text-white rounded-md p-3 border border-gray-600 hover:bg-gray-600 transition">
              Klik untuk Mengunggah Gambar
            </label>
            <input
              id="video-file-upload"
              ref={videoFileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleVideoFileChange}
              className="hidden"
            />
          </>
        )}
      </DnaInputSection>
      
      <DnaInputSection title="Konsep & Subjek Inti" description="Tentukan ide utama video Anda.">
        <input
          type="text"
          value={videoSubject}
          onChange={(e) => setVideoSubject(e.target.value)}
          placeholder="Subjek video (misal: seorang wanita menampilkan produk fashion)"
          className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        />
        <textarea
          value={videoAction}
          onChange={(e) => setVideoAction(e.target.value)}
          placeholder="Aksi utama (misal: berjalan anggun sambil memegang tas tangan)"
          rows={2}
          className="w-full mt-4 bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        />
      </DnaInputSection>

      <div className="pt-6 border-t border-gray-700" />

      {/* --- Structured Prompt Generator --- */}
      <DnaInputSection 
        title={currentTexts.title} 
        description={currentTexts.description}
        titleExtra={
             <div className="flex items-center gap-2 text-xs">
                <span className={jsonPromptLanguage === 'en' ? 'text-white' : 'text-gray-400'}>EN</span>
                <label htmlFor="lang-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="lang-toggle" className="sr-only peer"
                        checked={jsonPromptLanguage === 'id'}
                        onChange={() => setJsonPromptLanguage(lang => lang === 'en' ? 'id' : 'en')}
                    />
                    <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <span className={jsonPromptLanguage === 'id' ? 'text-white' : 'text-gray-400'}>ID</span>
            </div>
        }
      >
        <div className="flex flex-col gap-6 bg-gray-900/50 p-4 rounded-lg">
            <div className="grid md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{currentTexts.dialogueStyleLabel}</label>
                    <select value={dialogueStyle} onChange={e => setDialogueStyle(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 text-sm">
                        {currentDialogueStyles.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{currentTexts.dialogueLanguageLabel}</label>
                    <select value={dialogueLanguage} onChange={e => setDialogueLanguage(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 text-sm">
                        {VIDEO_LANGUAGES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{currentTexts.dialogueTempoLabel}</label>
                    <select value={dialogueTempo} onChange={e => setDialogueTempo(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 text-sm">
                        {currentDialogueTempos.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            </div>
             <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-300">Konsep Video</label>
                <select value={videoConcept} onChange={e => setVideoConcept(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600">
                    {VIDEO_CONCEPTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {videoConcept === 'Kustom...' && (
                     <input type="text" value={customVideoConcept} onChange={e => setCustomVideoConcept(e.target.value)} placeholder="Masukkan konsep video kustom..." className="w-full mt-2 bg-gray-800 text-white rounded-md p-3 border border-gray-600" />
                )}
            </div>
            
            <MovementSelector label={currentTexts.hookTitle} value={hookMovement} onChange={setHookMovement} customValue={customHookMovement} onCustomChange={setCustomHookMovement} dialogueValue={hookDialogue} onDialogueChange={setHookDialogue} />
            <MovementSelector label={currentTexts.problemTitle} value={problemMovement} onChange={setProblemMovement} customValue={customProblemMovement} onCustomChange={setCustomProblemMovement} dialogueValue={problemDialogue} onDialogueChange={setProblemDialogue} />
            <MovementSelector label={currentTexts.ctaTitle} value={ctaMovement} onChange={setCtaMovement} customValue={customCtaMovement} onCustomChange={setCustomCtaMovement} dialogueValue={ctaDialogue} onDialogueChange={setCtaDialogue} />
        </div>
        <button
          onClick={handleGenerateJsonPrompt}
          disabled={isJsonLoading}
          className="w-full mt-4 py-2 px-4 text-md font-semibold text-white rounded-lg bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md"
        >
          {isJsonLoading ? currentTexts.loadingButton : currentTexts.generateButton}
        </button>
        {jsonError && <p className="text-red-400 text-sm mt-2">{jsonError}</p>}
        {parsedJsonPrompt && (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-200">Hasil Prompt JSON</h3>
                {parsedJsonPrompt.map((block, index) => (
                    <JsonBlock key={index} title={`Scene ${index + 1}`} data={block} blockIndex={index} />
                ))}
            </div>
        )}
      </DnaInputSection>

      {/* --- Image output for structured prompt --- */}
       {(isJsonImageLoading || jsonImageError || jsonGeneratedImages) && (
            <DnaInputSection title="Visual Referensi Adegan" description="Gambar yang dihasilkan AI berdasarkan setiap adegan dari prompt JSON.">
                {isJsonImageLoading && <p className="text-gray-400">Menghasilkan visual adegan...</p>}
                {jsonImageError && <p className="text-red-400 text-sm">{jsonImageError}</p>}
                {jsonGeneratedImages && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {jsonGeneratedImages.map((image, index) => (
                            <div key={index} className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                                <img src={image} alt={`Visual Adegan ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}
            </DnaInputSection>
        )}


      <div className="pt-6 border-t border-gray-700" />

      {/* --- Simple Video Generator --- */}
      <DnaInputSection title="Prompt Video Final (Mode Sederhana)" description="Gunakan kontrol di bawah ini untuk membuat prompt video sederhana. Ini tidak menggunakan generator JSON di atas.">
        <p className="text-gray-400 bg-gray-900/50 p-4 rounded-md text-sm leading-relaxed min-h-[100px]">
            {finalVideoPrompt}
        </p>
      </DnaInputSection>

      <button
        onClick={handleGenerateVideo}
        disabled={isVideoLoading || !finalVideoPrompt.trim()}
        className="w-full py-3 px-6 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
      >
        {isVideoLoading ? 'Menghasilkan Video...' : 'Hasilkan Video (Mode Sederhana)'}
      </button>

      {/* Video Output Section */}
      <div className="mt-6">
        {isVideoLoading && (
            <div className="flex flex-col items-center justify-center gap-4 text-gray-400 p-4 bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-600 min-h-[200px]">
                <svg className="animate-spin h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg font-semibold">Video sedang dibuat...</p>
                <p className="text-sm text-center max-w-md">{videoLoadingMessage || 'Proses ini mungkin memakan waktu beberapa menit. Harap jangan tutup atau segarkan halaman ini.'}</p>
            </div>
        )}
        {videoError && (
             <div className="text-center text-red-400 p-4 bg-red-900/20 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Gagal Menghasilkan Video</h3>
                <p className="text-sm">{videoError}</p>
             </div>
        )}
        {generatedVideo && (
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-contain" />
            </div>
        )}
      </div>
    </>
    );
  };

  return (
    <div className="bg-gray-800 min-h-screen">
      <div className="container mx-auto p-4 md:p-8 text-white max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            Bang Muze Tools Generator
          </h1>
          <p className="text-gray-400 mt-2">
            Ciptakan visual dan video menakjubkan dari imajinasi Anda.
          </p>
        </header>

        {!isApiKeySelected ? (
            <div className="bg-gray-900/50 p-6 rounded-lg text-center flex flex-col items-center gap-4">
                <h2 className="text-2xl font-semibold text-yellow-400">Diperlukan Kunci API</h2>
                <p className="text-gray-300 max-w-md">
                    Untuk menggunakan fungsionalitas pembuatan video, Anda harus memilih Kunci API.
                    Ini memastikan Anda terhubung ke layanan AI Google.
                </p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">
                    Pelajari tentang penagihan
                </a>
                <button
                    onClick={handleSelectKey}
                    className="mt-2 py-2 px-6 text-md font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 transition-all duration-300 shadow-md"
                >
                    Pilih Kunci API
                </button>
            </div>
        ) : (
          <>
            <div className="flex justify-center mb-8 bg-gray-900/50 p-2 rounded-full">
                <button 
                    onClick={() => handleModeChange('product')}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${generatorMode === 'product' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400'}`}
                >
                    Generator Gambar
                </button>
                <button 
                    onClick={() => handleModeChange('video')}
                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${generatorMode === 'video' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400'}`}
                >
                    Generator Video
                </button>
            </div>
            
            <main className={`flex flex-col gap-8 transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
              {generatorMode === 'product' ? renderProductGenerator() : renderVideoGenerator()}
            </main>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
