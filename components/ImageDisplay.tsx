
import React, { useState } from 'react';

interface ImageDisplayProps {
  generatedImages: string[] | null;
  isLoading: boolean;
  error: string | null;
  aspectRatio: string;
  onUseForVideo: (imageUrl: string) => void;
}

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-4 text-gray-400">
    <svg className="animate-spin h-12 w-12 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-lg">Menciptakan visi Anda...</p>
  </div>
);

const ImageDisplay: React.FC<ImageDisplayProps> = ({ generatedImages, isLoading, error, aspectRatio, onUseForVideo }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleDownload = (imageUrl: string, index: number) => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    // Extract file extension from mime type for a better filename
    const mimeType = imageUrl.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1] || 'jpg';
    link.download = `gemini-dna-image-pose-${index + 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className={`w-full bg-gray-900/50 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-600 min-h-[400px]`}>
        {isLoading && <LoadingSpinner />}
        {!isLoading && error && (
           <div className="text-center text-red-400 p-4">
              <h3 className="font-bold text-lg mb-2">Gagal Menghasilkan Gambar</h3>
              <p className="text-sm">{error}</p>
           </div>
        )}
        {!isLoading && !error && generatedImages && (
          <div className="grid grid-cols-2 gap-4 w-full h-full">
            {generatedImages.map((image, index) => (
              <div key={index} className="relative group w-full aspect-square bg-gray-800 rounded-lg overflow-hidden">
                <img 
                  src={image} 
                  alt={`Dihasilkan oleh Gemini - Pose ${index + 1}`} 
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center">
                  <div className="flex items-center flex-wrap justify-center gap-2">
                      <button
                          onClick={() => setPreviewImage(image)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 py-2 px-4 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-gray-600 to-blue-600 hover:from-gray-700 hover:to-blue-700 transform-gpu group-hover:scale-100 scale-90"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Pratinjau</span>
                      </button>
                      <button
                          onClick={() => handleDownload(image, index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 py-2 px-4 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 transform-gpu group-hover:scale-100 scale-90"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Simpan</span>
                      </button>
                      <button
                          onClick={() => onUseForVideo(image)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 py-2 px-4 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transform-gpu group-hover:scale-100 scale-90"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Buat Video</span>
                      </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* The placeholder is intentionally left empty in the initial state to keep the UI clean, as requested. */}
        {!isLoading && !error && !generatedImages && null}
      </div>

      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 cursor-pointer" 
          onClick={() => setPreviewImage(null)}
        >
            <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={previewImage} 
                  alt="Pratinjau Gambar" 
                  className="w-auto h-auto max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-default"
                />
                <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute -top-3 -right-3 bg-gray-800 rounded-full p-2 text-white hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Tutup pratinjau"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
      )}
    </>
  );
};

export default ImageDisplay;
