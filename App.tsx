
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
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');

  // Mode State
  const [generatorMode, setGeneratorMode] = useState<'product' | 'video'>('product');
  
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
  
  // Check for API key in localStorage on initial load
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
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

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey);
      localStorage.setItem('gemini-api-key', tempApiKey);
    }
  };

  const handleGenerateImage = useCallback(async () => {
    if (!apiKey) return;

    // DEBUG: Log the API key being used for the request
    console.log('Menggunakan API Key:', apiKey);

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
        
        // Make requests sequentially to avoid rate limiting errors
        const generatedUrls: string[] = [];
        for (const pose of posePrompts) {
            const fullPrompt = `${finalPrompt}, ${pose}. Subjek harus terlihat konsisten dengan gambar referensi.`;
            const imageUrl = await editImageWithPrompt(apiKey, fullPrompt, processedImage);
            generatedUrls.push(imageUrl);
        }
        imageUrls = generatedUrls;

      } else {
        imageUrls = await generateImageFromText(apiKey, finalPrompt, aspectRatio);
      }
      setGeneratedImages(imageUrls);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, finalPrompt, uploadedImage, processedImage, aspectRatio]);

  const handleGenerateVideo = useCallback(async () => {
    if (!apiKey) return;
    setIsVideoLoading(true);
    setVideoError(null);
    setGeneratedVideo(null);
    setVideoLoadingMessage('Mempersiapkan pembuatan video...');
    try {
        const videoUrl = await generateVideoFromPrompt(
            apiKey,
            finalVideoPrompt,
            videoAspectRatio as '16:9' | '9:16',
            videoResolution as '720p' | '1080p',
            videoUploadedImage,
            (message) => setVideoLoadingMessage(message)
        );
        setGeneratedVideo(videoUrl);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui saat membuat video.';
        if (errorMessage.includes('API key not valid') || errorMessage.includes('Kunci API')) {
          setVideoError('Kunci API Anda tidak valid. Silakan periksa dan masukkan kunci yang benar.');
          localStorage.removeItem('gemini-api-key');
          setApiKey(''); // Clear the key to show the input form again
        } else {
            setVideoError(errorMessage);
        }
        console.error(err);
    } finally {
        setIsVideoLoading(false);
        setVideoLoadingMessage('');
    }
  }, [apiKey, finalVideoPrompt, videoAspectRatio, videoResolution, videoUploadedImage]);

  const handleGetFeedback = useCallback(async () => {
    if (!apiKey) return;
    setIsFeedbackLoading(true);
    setFeedbackError(null);
    setPromptFeedback(null);
    const currentPrompt = generatorMode === 'product' ? finalPrompt : finalVideoPrompt;
    try {
        const feedback = await getPromptFeedback(apiKey, currentPrompt);
        setPromptFeedback(feedback);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal mendapatkan saran.';
        setFeedbackError(errorMessage);
        console.error(err);
    } finally {
        setIsFeedbackLoading(false);
    }
  }, [apiKey, finalPrompt, finalVideoPrompt, generatorMode]);

  const handleGetSmartSuggestions = useCallback(async () => {
    if (!apiKey) return;
    setIsSuggestionsLoading(true);
    setSuggestionsError(null);
    setSmartSuggestions(null);
    try {
        const suggestions = await getSmartSuggestions(apiKey, { subject, style, environment });
        setSmartSuggestions(suggestions);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal mendapatkan prompt cerdas.';
        setSuggestionsError(errorMessage);
        console.error(err);
    } finally {
        setIsSuggestionsLoading(false);
    }
  }, [apiKey, subject, style, environment]);
  
  const handleGenerateDialogue = useCallback(async (movement: string) => {
    if (!apiKey) return;
    setIsDialogueLoading(true);
    setDialogueError(null);
    try {
        const generatedDialogue = await generateDialogueScript(apiKey, {
            subject: videoSubject,
            action: videoAction,
            movement: movement,
        });
        setDialogueText(generatedDialogue);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal menghasilkan dialog.';
        setDialogueError(errorMessage);
        console.error(err);
    } finally {
        setIsDialogueLoading(false);
    }
  }, [apiKey, videoSubject, videoAction]);
  
  const handleGenerateJsonPrompt = useCallback(async () => {
    if (!apiKey) return;
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
        const jsonString = await generateJsonPrompt(apiKey, {
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
                generateSingleImage(apiKey, prompt, videoAspectRatio as any)
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
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate or parse JSON prompt.';
        setJsonError(errorMessage);
        console.error(err);
    } finally {
        setIsJsonLoading(false);
    }
  }, [
    apiKey,
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
    if (!apiKey || !videoUploadedImage) return;
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    try {
        const analysis = await analyzeImageForMovement(apiKey, videoUploadedImage);
        setVideoAction(analysis.mainAction);
        setCameraMovement(analysis.cameraMovement);
        
        setHookMovement('Custom');
        setCustomHookMovement(analysis.hookMovement);
        
        setProblemMovement('Custom');
        setCustomProblemMovement(analysis.problemMovement);

        setCtaMovement('Custom');
        setCustomCtaMovement(analysis.ctaMovement);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal menganalisis gerakan.';
        setAnalysisError(errorMessage);
        console.error(err);
    } finally {
        setIsAnalysisLoading(false);
    }
  }, [apiKey, videoUploadedImage]);

  const handleCopyBlock = (blockContent: any, blockIndex: number) => {
      const jsonString = JSON.stringify(blockContent, null, 2);
      navigator.clipboard.writeText(jsonString).then(() => {
          setCopiedBlock(blockIndex);
          setTimeout(() => setCopiedBlock(null), 2000);
      });
  };
  
  // FIX: Explicitly type JsonBlock as a React.FC to correctly handle the `key` prop provided during mapping.
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
        <DnaInputSection title="Hasil Gambar" description={generatedImages ? "4 variasi pose dihasilkan. Arahkan kursor untuk menyimpan." : ""}>
          <ImageDisplay
            generatedImages={generatedImages}
            isLoading={isLoading}
            error={error}
            aspectRatio={aspectRatio}
          />
        </DnaInputSection>
      </div>
    </>
  );

  const renderVideoGenerator = () => {
    const currentTexts = STRUCTURED_PROMPT_TEXTS[jsonPromptLanguage];
    const currentMovementOptions = MOVEMENT_OPTIONS[jsonPromptLanguage];

    return (
    <>
      <DnaInputSection title="Konsep Video" description="Pilih konsep utama untuk video Anda.">
          <select
              value={videoConcept}
              onChange={(e) => setVideoConcept(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          >
              {VIDEO_CONCEPTS.map((option) => (
                  <option key={option} value={option}>{option}</option>
              ))}
          </select>
          {videoConcept === 'Kustom...' && (
              <input
                  type="text"
                  value={customVideoConcept}
                  onChange={(e) => setCustomVideoConcept(e.target.value)}
                  placeholder="Tulis konsep video kustom di sini..."
                  className="w-full mt-4 bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              />
          )}
      </DnaInputSection>

      <DnaInputSection title="Gambar Referensi" description="Unggah gambar sebagai bingkai awal atau referensi gaya untuk video Anda.">
        {videoUploadedImage ? (
           <div className="flex flex-col gap-4 items-center">
              <img src={videoUploadedImage} alt="Pratinjau yang diunggah" className="w-full max-w-md rounded-lg border-2 border-gray-600 object-contain" />
              <div className="w-full flex justify-center gap-4 mt-2">
                <button 
                    onClick={removeVideoUploadedImage}
                    className="px-4 py-2 bg-red-600/50 text-white rounded-lg hover:bg-red-600/80 transition"
                >
                    Hapus
                </button>
                <button
                    onClick={handleAnalyzeMovement}
                    disabled={isAnalysisLoading}
                    className="py-2 px-4 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
                >
                    {isAnalysisLoading ? 'Menganalisis...' : 'Analisis Gerakan'}
                </button>
              </div>
              {analysisError && <p className="text-red-400 text-xs mt-2">{analysisError}</p>}
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

      <DnaInputSection title="Subjek Inti" description="Karakter atau objek utama dalam video Anda.">
          <input
              type="text"
              value={videoSubject}
              onChange={(e) => setVideoSubject(e.target.value)}
              placeholder="contoh: Astronot mengambang"
              className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          />
      </DnaInputSection>

      <DnaInputSection title="Aksi / Gerakan Utama" description="Apa yang dilakukan subjek?">
          <textarea
              value={videoAction}
              onChange={(e) => setVideoAction(e.target.value)}
              placeholder="contoh: memegang produk dan menunjukkannya ke kamera"
              rows={2}
              className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          />
      </DnaInputSection>

       <DnaInputSection 
        title="Structured Video Prompt"
        description={currentTexts.description}
        titleExtra={
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${jsonPromptLanguage === 'en' ? 'text-white' : 'text-gray-400'}`}>EN</span>
            <label htmlFor="lang-toggle" className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="lang-toggle" className="sr-only peer" 
                  checked={jsonPromptLanguage === 'id'} 
                  onChange={() => setJsonPromptLanguage(lang => lang === 'en' ? 'id' : 'en')} />
                <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
            <span className={`text-xs font-semibold ${jsonPromptLanguage === 'id' ? 'text-white' : 'text-gray-400'}`}>ID</span>
          </div>
        }
       >
        <div className="flex flex-col gap-6 p-4 bg-gray-900/50 rounded-lg">
            {/* Dialogue Settings Section */}
            <div className="mb-2 p-4 border-b border-gray-700/50">
              <h4 className="text-md font-semibold text-gray-300 mb-3">{currentTexts.dialogueSettingsTitle}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">{currentTexts.dialogueStyleLabel}</label>
                      <select
                          value={dialogueStyle}
                          onChange={(e) => setDialogueStyle(e.target.value)}
                          className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                      >
                          {DIALOGUE_STYLES[jsonPromptLanguage].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">{currentTexts.dialogueLanguageLabel}</label>
                      <select
                          value={dialogueLanguage}
                          onChange={(e) => setDialogueLanguage(e.target.value)}
                          className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                      >
                          {VIDEO_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">{currentTexts.dialogueTempoLabel}</label>
                      <select
                          value={dialogueTempo}
                          onChange={(e) => setDialogueTempo(e.target.value)}
                          className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                      >
                          {DIALOGUE_TEMPOS[jsonPromptLanguage].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                  </div>
              </div>
            </div>

            {/* Hook Section */}
            <div className="flex flex-col gap-2">
                <h4 className="text-md font-semibold text-gray-300">1. {currentTexts.hookTitle}</h4>
                <select
                    value={hookMovement}
                    onChange={(e) => setHookMovement(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                >
                    {currentMovementOptions.map(opt => <option key={`hook-${opt.value}`} value={opt.value}>{opt.label}</option>)}
                </select>
                {hookMovement === 'Custom' && (
                    <input
                        type="text"
                        value={customHookMovement}
                        onChange={(e) => setCustomHookMovement(e.target.value)}
                        placeholder={currentTexts.customPlaceholder}
                        className="w-full mt-2 bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    />
                )}
                 <textarea
                    value={hookDialogue}
                    onChange={(e) => setHookDialogue(e.target.value)}
                    placeholder={currentTexts.dialoguePlaceholder}
                    rows={2}
                    className="w-full mt-2 bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-sm"
                />
            </div>
            {/* Problem-Solve Section */}
            <div className="flex flex-col gap-2">
                <h4 className="text-md font-semibold text-gray-300">2. {currentTexts.problemTitle}</h4>
                <select
                    value={problemMovement}
                    onChange={(e) => setProblemMovement(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                >
                    {currentMovementOptions.map(opt => <option key={`problem-${opt.value}`} value={opt.value}>{opt.label}</option>)}
                </select>
                {problemMovement === 'Custom' && (
                    <input
                        type="text"
                        value={customProblemMovement}
                        onChange={(e) => setCustomProblemMovement(e.target.value)}
                        placeholder={currentTexts.customPlaceholder}
                        className="w-full mt-2 bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    />
                )}
                <textarea
                    value={problemDialogue}
                    onChange={(e) => setProblemDialogue(e.target.value)}
                    placeholder={currentTexts.dialoguePlaceholder}
                    rows={2}
                    className="w-full mt-2 bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-sm"
                />
            </div>
            {/* CTA Section */}
            <div className="flex flex-col gap-2">
                <h4 className="text-md font-semibold text-gray-300">3. {currentTexts.ctaTitle}</h4>
                <select
                    value={ctaMovement}
                    onChange={(e) => setCtaMovement(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                >
                    {currentMovementOptions.map(opt => <option key={`cta-${opt.value}`} value={opt.value}>{opt.label}</option>)}
                </select>
                {ctaMovement === 'Custom' && (
                    <input
                        type="text"
                        value={customCtaMovement}
                        onChange={(e) => setCustomCtaMovement(e.target.value)}
                        placeholder={currentTexts.customPlaceholder}
                        className="w-full mt-2 bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    />
                )}
                <textarea
                    value={ctaDialogue}
                    onChange={(e) => setCtaDialogue(e.target.value)}
                    placeholder={currentTexts.dialoguePlaceholder}
                    rows={2}
                    className="w-full mt-2 bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition text-sm"
                />
            </div>
        </div>

        <button
            onClick={handleGenerateJsonPrompt}
            disabled={isJsonLoading || !videoSubject.trim()}
            className="w-full mt-4 py-2 px-4 text-md font-semibold text-white rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-cyan-500/50"
        >
            {isJsonLoading ? currentTexts.loadingButton : currentTexts.generateButton}
        </button>
        {isJsonLoading && (
            <div className="text-center text-gray-400 mt-4">
                <svg className="animate-spin h-6 w-6 mx-auto text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        )}
        {jsonError && <p className="text-red-400 text-sm mt-2">{jsonError}</p>}
        {parsedJsonPrompt && (
            <div className="mt-4 flex flex-col gap-2">
                {parsedJsonPrompt.map((item, index) => {
                    const titles = ["1. Hook Scene", "2. Problem-Solve Scene", "3. CTA Scene"];
                    return (
                        <JsonBlock 
                            key={index}
                            title={titles[index]} 
                            data={item}
                            blockIndex={index} 
                        />
                    );
                })}
            </div>
        )}
      </DnaInputSection>

      {/* --- Section for Auto-Generated Scene Images --- */}
      {(isJsonImageLoading || jsonGeneratedImages || jsonImageError) && (
          <DnaInputSection title="Visual Referensi Adegan" description="Gambar yang dihasilkan AI untuk setiap adegan kunci.">
              <div className="w-full bg-gray-900/50 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-600 min-h-[250px]">
                  {isJsonImageLoading && (
                      <div className="flex flex-col items-center justify-center gap-4 text-gray-400">
                          <svg className="animate-spin h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-lg">Membuat visual adegan...</p>
                      </div>
                  )}
                  {!isJsonImageLoading && jsonImageError && (
                      <div className="text-center text-red-400 p-4">
                          <h3 className="font-bold text-lg mb-2">Gagal Membuat Visual</h3>
                          <p className="text-sm">{jsonImageError}</p>
                      </div>
                  )}
                  {!isJsonImageLoading && !jsonImageError && jsonGeneratedImages && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                          {jsonGeneratedImages.map((image, index) => {
                              const titles = ["Hook", "Problem-Solve", "CTA"];
                              return (
                                  <div key={index} className="flex flex-col items-center gap-2">
                                      <h4 className="text-md font-semibold text-gray-300">{titles[index]}</h4>
                                      <div className="relative group w-full aspect-square bg-gray-800 rounded-lg overflow-hidden">
                                          <img 
                                              src={image} 
                                              alt={`Visual untuk adegan ${titles[index]}`} 
                                              className="w-full h-full object-contain"
                                          />
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </DnaInputSection>
      )}


      <DnaInputSection title="Suara" description="Tambahkan narasi audio ke video Anda.">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-gray-300">Aktifkan Suara</h3>
              <label htmlFor="sound-toggle" className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="sound-toggle" className="sr-only peer" checked={isSoundEnabled} onChange={() => setIsSoundEnabled(!isSoundEnabled)} />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
          </div>
          {isSoundEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-900/50 rounded-lg">
                  <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Bahasa</h4>
                      <select value={soundLanguage} onChange={(e) => setSoundLanguage(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                          {VIDEO_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                      </select>
                  </div>
                  <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Gender Suara</h4>
                      <select value={voiceGender} onChange={(e) => setVoiceGender(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                          {VOICE_GENDERS.map(gender => <option key={gender} value={gender}>{gender}</option>)}
                      </select>
                  </div>
                  <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Gaya Bicara</h4>
                       <select value={speakingStyle} onChange={(e) => setSpeakingStyle(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                          {SPEAKING_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                      </select>
                  </div>
                  <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Suasana</h4>
                       <select value={videoMood} onChange={(e) => setVideoMood(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition">
                          {VIDEO_MOODS.map(mood => <option key={mood} value={mood}>{mood}</option>)}
                      </select>
                  </div>
              </div>
          )}
      </DnaInputSection>

      <DnaInputSection title="Dialog" description="Tambahkan dialog atau monolog khusus ke video Anda.">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-gray-300">Aktifkan Dialog</h3>
              <label htmlFor="dialogue-toggle" className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="dialogue-toggle" className="sr-only peer" checked={isDialogueEnabled} onChange={() => setIsDialogueEnabled(!isDialogueEnabled)} />
                  <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
          </div>
          {isDialogueEnabled && (
            <div className="flex flex-col gap-3 p-4 bg-gray-900/50 rounded-lg mb-4">
                <h4 className="text-sm font-medium text-gray-400">Pembangkit Dialog Otomatis</h4>
                <p className="text-xs text-gray-500">Pilih gerakan untuk menghasilkan dialog yang sesuai secara otomatis berdasarkan subjek dan aksi Anda.</p>
                <div className="flex flex-wrap gap-2">
                    {['Gerakan 1', 'Gerakan 2', 'Gerakan 3'].map(gerakan => (
                        <button
                            key={gerakan}
                            onClick={() => handleGenerateDialogue(gerakan)}
                            disabled={isDialogueLoading}
                            className="px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {gerakan}
                        </button>
                    ))}
                </div>
                 {dialogueError && <p className="text-red-400 text-xs mt-1">{dialogueError}</p>}
            </div>
          )}
          <textarea
              value={dialogueText}
              onChange={(e) => setDialogueText(e.target.value)}
              placeholder={isDialogueLoading ? "Menghasilkan dialog..." : "Tulis dialog Anda di sini atau gunakan pembangkit otomatis..."}
              rows={3}
              disabled={!isDialogueEnabled || isDialogueLoading}
              className={`w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition ${!isDialogueEnabled || isDialogueLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
      </DnaInputSection>

      <DnaInputSection title="Gaya Video" description="Tentukan estetika visual keseluruhan dari video.">
          <SelectableTags options={VIDEO_STYLES} selected={videoStyle} onSelect={setVideoStyle} />
      </DnaInputSection>

      <DnaInputSection title="Rasio Aspek & Resolusi" description="Atur dimensi dan kualitas video.">
          <div className="flex flex-col gap-4">
              <div>
                  <h3 className="text-md font-medium text-gray-300 mb-2">Rasio Aspek</h3>
                  <SelectableTags options={ASPECT_RATIOS.filter(r => r === '16:9' || r === '9:16')} selected={videoAspectRatio} onSelect={setVideoAspectRatio} />
              </div>
              <div>
                  <h3 className="text-md font-medium text-gray-300 mb-2">Resolusi</h3>
                  <SelectableTags options={VIDEO_RESOLUTIONS} selected={videoResolution} onSelect={setVideoResolution} />
              </div>
          </div>
      </DnaInputSection>

      <DnaInputSection title="Lingkungan / Latar" description="Pilih atau jelaskan latar belakang untuk video.">
          <select
              value={videoEnvironment}
              onChange={(e) => setVideoEnvironment(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          >
              {ENVIRONMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                      {option}
                  </option>
              ))}
          </select>
      </DnaInputSection>
      
      <DnaInputSection title="Waktu & Pencahayaan" description="Atur suasana melalui waktu dan gaya pencahayaan.">
          <div className="flex flex-col gap-4">
              <div>
                  <h3 className="text-md font-medium text-gray-300 mb-2">Waktu</h3>
                  <SelectableTags options={TIME_OPTIONS} selected={videoTimeOfDay} onSelect={setVideoTimeOfDay} />
              </div>
              <div>
                  <h3 className="text-md font-medium text-gray-300 mb-2">Pencahayaan</h3>
                  <SelectableTags options={LIGHTING_STYLES} selected={videoLightingStyle} onSelect={setVideoLightingStyle} />
              </div>
          </div>
      </DnaInputSection>

      <DnaInputSection title="Gerakan Kamera" description="Jelaskan bagaimana kamera bergerak selama pengambilan gambar.">
          <SelectableTags options={CAMERA_MOVEMENTS} selected={cameraMovement} onSelect={setCameraMovement} />
      </DnaInputSection>

      <DnaInputSection title="Palet Warna" description="Pilih skema warna yang dominan untuk video.">
          <SelectableTags options={COLOR_PALETTES} selected={videoPalette} onSelect={setVideoPalette} />
      </DnaInputSection>

      <DnaInputSection title="Detail Tambahan" description="Tambahkan detail atau hiasan spesifik lainnya.">
          <textarea
              value={videoDetails}
              onChange={(e) => setVideoDetails(e.target.value)}
              placeholder="contoh: dengan partikel debu bintang yang berkilauan"
              rows={2}
              className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          />
      </DnaInputSection>

      {/* Final Video Prompt Section */}
       <div className="flex flex-col gap-2 pt-6 border-t border-gray-700">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">Prompt Video Final</h2>
        </div>
        <p className="text-sm text-gray-400 mb-2">Ini adalah prompt lengkap yang akan digunakan untuk menghasilkan video Anda.</p>
        <p className="text-gray-400 bg-gray-900/50 p-4 rounded-md text-sm leading-relaxed">
            {finalVideoPrompt}
        </p>
      </div>

       {/* Video Output Section */}
      <DnaInputSection title="Hasil Video" description="Video Anda akan muncul di bawah ini.">
        <div className="aspect-video w-full bg-gray-900/50 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-600">
            {isVideoLoading && (
                <div className="text-center text-gray-400">
                    <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>{videoLoadingMessage || 'Menghasilkan video...'}</p>
                </div>
            )}
            {!isVideoLoading && videoError && <p className="text-red-400">{videoError}</p>}
            {!isVideoLoading && !videoError && !generatedVideo && (
                <div className="text-center text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p>Video yang dihasilkan akan muncul di sini.</p>
                </div>
            )}
            {generatedVideo && !isVideoLoading && !videoError && (
                <video src={generatedVideo} controls className="w-full h-full rounded" />
            )}
        </div>
      </DnaInputSection>

      {/* Generate Video Button */}
      <button
        onClick={handleGenerateVideo}
        disabled={isVideoLoading || !finalVideoPrompt.trim()}
        className="w-full py-4 px-6 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-500/50 transform hover:scale-105"
      >
        {isVideoLoading ? 'Menghasilkan...' : 'Hasilkan Video'}
      </button>
    </>
    );
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 shadow-2xl">
            <h1 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
              Selamat Datang!
            </h1>
            <p className="text-center text-gray-400 mb-6">Untuk menggunakan aplikasi, masukkan Gemini API Key Anda.</p>
            <form onSubmit={handleApiKeySubmit}>
              <div className="flex flex-col gap-4">
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Masukkan API Key Anda di sini"
                  className="w-full bg-gray-700 text-white rounded-md p-3 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                />
                <button
                  type="submit"
                  className="w-full py-3 px-6 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 disabled:opacity-50 transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                >
                  Simpan & Mulai
                </button>
              </div>
            </form>
             <p className="text-center text-xs text-gray-500 mt-4">
               API Key Anda disimpan di browser Anda dan tidak pernah dikirim ke server kami.
               Dapatkan kunci Anda dari <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google AI Studio</a>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="mb-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              Bang Muze Tools Generator
            </h1>
            <p className="mt-2 text-lg text-gray-400">
              Imajinasikan ide kalian menjadi kenyataan dengan cepat dan akurat.
            </p>
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <button 
              onClick={() => setGeneratorMode('product')}
              className={`flex items-center gap-2 px-6 py-2 text-md font-semibold rounded-lg transition-all duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-opacity-50 transform hover:scale-105 ${generatorMode === 'product' ? 'text-white bg-gradient-to-r from-purple-600 to-cyan-500 focus:ring-purple-500' : 'text-gray-300 bg-gray-700 hover:bg-gray-600 focus:ring-gray-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Image Generator</span>
            </button>
            <button 
              onClick={() => setGeneratorMode('video')}
              className={`flex items-center gap-2 px-6 py-2 text-md font-semibold rounded-lg transition-all duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-opacity-50 transform hover:scale-105 ${generatorMode === 'video' ? 'text-white bg-gradient-to-r from-purple-600 to-cyan-500 focus:ring-purple-500' : 'text-gray-300 bg-gray-700 hover:bg-gray-600 focus:ring-gray-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Video Generator</span>
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-6 p-6 bg-gray-800/50 rounded-2xl border border-gray-700">
            {generatorMode === 'product' ? renderProductGenerator() : renderVideoGenerator()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
