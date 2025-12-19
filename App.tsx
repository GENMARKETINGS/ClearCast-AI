
import React, { useState, useRef, useEffect } from 'react';
import { removeWatermarkFromImage, processVideoWatermark, fileToBase64 } from './services/gemini';
import { 
  CloudArrowUpIcon, 
  TrashIcon, 
  SparklesIcon, 
  ArrowDownTrayIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  PhotoIcon,
  VideoCameraIcon,
  KeyIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface EditHistory {
  type: 'image' | 'video';
  original: string;
  edited: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [processedResult, setProcessedResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("Remove the watermark and logos, keeping the background seamless.");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key handling for Veo models
  const checkAndPromptKey = async () => {
    if (activeTab === 'video') {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        return true; // Proceed assuming they selected it (to avoid race condition)
      }
    }
    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (activeTab === 'image' && !file.type.startsWith('image/')) {
        setError("Please select an image file.");
        return;
      }
      if (activeTab === 'video' && !file.type.startsWith('video/')) {
        setError("Please select a video file.");
        return;
      }

      setMimeType(file.type);
      try {
        const base64 = await fileToBase64(file);
        setSelectedFile(base64);
        setProcessedResult(null);
        setError(null);
      } catch (err) {
        setError("Error reading file.");
      }
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setError(null);
    try {
      if (activeTab === 'image') {
        const result = await removeWatermarkFromImage(selectedFile, mimeType, instruction);
        if (result) {
          setProcessedResult(result);
          addToHistory('image', selectedFile, result);
        } else {
          setError("Failed to process the image.");
        }
      } else {
        // Video mode
        await checkAndPromptKey();
        // For video, we use the instruction as the prompt for regeneration
        const result = await processVideoWatermark(instruction, videoAspectRatio);
        if (result) {
          setProcessedResult(result);
          addToHistory('video', selectedFile, result);
        } else {
          setError("Video processing timed out or failed.");
        }
      }
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setError("API Key configuration error. Please select a valid key.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const addToHistory = (type: 'image' | 'video', original: string, edited: string) => {
    setHistory(prev => [{
      type,
      original,
      edited,
      timestamp: Date.now()
    }, ...prev]);
  };

  const clearCurrent = () => {
    setSelectedFile(null);
    setProcessedResult(null);
    setError(null);
  };

  const downloadResult = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `clearcast-${activeTab}-${Date.now()}.${activeTab === 'image' ? 'png' : 'mp4'}`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ClearCast <span className="text-blue-500">AI</span></h1>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => { setActiveTab('image'); clearCurrent(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'image' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <PhotoIcon className="w-4 h-4" /> Images
          </button>
          <button 
            onClick={() => { setActiveTab('video'); clearCurrent(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'video' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <VideoCameraIcon className="w-4 h-4" /> Videos
          </button>
        </div>

        <button 
          // @ts-ignore
          onClick={() => window.aistudio.openSelectKey()}
          className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <KeyIcon className="w-4 h-4" /> API Key
        </button>
      </header>

      {/* Hero / Upload */}
      {!selectedFile && (
        <main className="flex flex-col items-center text-center max-w-3xl mb-12 py-12">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Remove <span className="gradient-text">Watermarks</span> From {activeTab === 'image' ? 'Images' : 'Videos'}
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl">
            {activeTab === 'image' 
              ? "Clean up your photos with pixel-perfect AI inpainting. No more distracting logos or Sora 2 watermarks."
              : "Advanced Veo-powered video regeneration. Describe the clean scene and we'll remove the watermark via generative restoration."
            }
          </p>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full md:w-[600px] h-64 glass rounded-3xl border-2 border-dashed border-gray-700 hover:border-blue-500 transition-all flex flex-col items-center justify-center cursor-pointer group pulse-border"
          >
            <div className={`p-4 rounded-full mb-4 group-hover:scale-110 transition-transform ${activeTab === 'image' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
              {activeTab === 'image' ? (
                <CloudArrowUpIcon className="w-10 h-10 text-blue-500" />
              ) : (
                <VideoCameraIcon className="w-10 h-10 text-purple-500" />
              )}
            </div>
            <p className="text-xl font-semibold mb-2">Upload your {activeTab}</p>
            <p className="text-gray-500 text-sm">
              {activeTab === 'image' ? 'Supports PNG, JPG, WebP up to 10MB' : 'Supports MP4, MOV up to 50MB'}
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept={activeTab === 'image' ? "image/*" : "video/*"}
            />
          </div>
          
          {activeTab === 'video' && (
            <div className="mt-8 flex items-center gap-2 text-xs text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <InformationCircleIcon className="w-4 h-4" />
              <span>Video mode requires a paid Google Cloud Project API Key. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline text-blue-400">Learn about billing</a></span>
            </div>
          )}
        </main>
      )}

      {/* Editor Layout */}
      {selectedFile && (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass rounded-3xl p-6 relative overflow-hidden min-h-[450px] flex items-center justify-center bg-black/20">
              {isProcessing && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-10 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className={`w-20 h-20 border-4 rounded-full animate-spin ${activeTab === 'image' ? 'border-blue-500/20 border-t-blue-500' : 'border-purple-500/20 border-t-purple-500'}`}></div>
                    <SparklesIcon className={`w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse ${activeTab === 'image' ? 'text-blue-500' : 'text-purple-500'}`} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xl mb-1">{activeTab === 'image' ? 'Removing Distractions...' : 'Regenerating Clean Video...'}</p>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto">
                      {activeTab === 'image' 
                        ? 'Our AI is analyzing surrounding pixels for a seamless fill.' 
                        : 'This can take a few minutes. We are creating a brand new, watermark-free version of your video.'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="w-full h-full flex items-center justify-center">
                {processedResult ? (
                  <div className="relative group w-full">
                    {activeTab === 'image' ? (
                      <img src={processedResult} alt="Result" className="max-w-full h-auto rounded-xl shadow-2xl mx-auto" />
                    ) : (
                      <video src={processedResult} controls className="max-w-full h-auto rounded-xl shadow-2xl mx-auto" />
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button 
                        onClick={() => downloadResult(processedResult)}
                        className="bg-white text-black p-2 rounded-lg shadow-lg hover:scale-105 transition-transform"
                        title="Download Result"
                      >
                        <ArrowDownTrayIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    {activeTab === 'image' ? (
                      <img src={selectedFile} alt="Original" className="max-w-full h-auto rounded-xl shadow-2xl mx-auto opacity-70" />
                    ) : (
                      <video src={selectedFile} className="max-w-full h-auto rounded-xl shadow-2xl mx-auto opacity-70" />
                    )}
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-gray-800/80 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">Upload Ready</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 text-red-200">
                <XMarkIcon className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-4 glass p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-300">AI Instructions</label>
                {activeTab === 'video' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setVideoAspectRatio('16:9')}
                      className={`text-[10px] px-2 py-1 rounded ${videoAspectRatio === '16:9' ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >16:9</button>
                    <button 
                      onClick={() => setVideoAspectRatio('9:16')}
                      className={`text-[10px] px-2 py-1 rounded ${videoAspectRatio === '9:16' ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >9:16</button>
                  </div>
                )}
              </div>
              <textarea 
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={activeTab === 'image' ? "E.g., remove the text in the bottom right corner..." : "E.g., A clean landscape with mountains and a clear sky, no text..."}
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all resize-none h-24"
              />

              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={clearCurrent}
                  className="px-4 py-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white flex items-center gap-2"
                >
                  <TrashIcon className="w-5 h-5" />
                  Discard
                </button>
                <button 
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className={`flex-1 ${activeTab === 'image' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'} disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg`}
                >
                  <SparklesIcon className="w-5 h-5" />
                  {isProcessing ? 'Processing...' : (processedResult ? 'Refine Results' : `Start ${activeTab === 'image' ? 'Image' : 'Video'} Clean`)}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="glass rounded-3xl p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                Recent Tasks
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full font-normal">{history.length}</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[600px] pr-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-center">
                    <SparklesIcon className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-sm">Your cleanups will appear here</p>
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <div 
                      key={item.timestamp} 
                      className="glass border-white/5 rounded-2xl p-3 group cursor-pointer hover:border-white/20 transition-all"
                      onClick={() => {
                        setActiveTab(item.type);
                        setSelectedFile(item.original);
                        setProcessedResult(item.edited);
                      }}
                    >
                      <div className="flex gap-3">
                        <div className="w-20 h-20 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.type === 'image' ? (
                            <img src={item.edited} className="object-cover w-full h-full" />
                          ) : (
                            <VideoCameraIcon className="w-8 h-8 text-purple-500/50" />
                          )}
                        </div>
                        <div className="flex flex-col justify-between py-1 overflow-hidden">
                          <p className="text-sm font-medium truncate">{item.type.charAt(0).toUpperCase() + item.type.slice(1)} Clean #{history.length - idx}</p>
                          <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</p>
                          <button 
                            onClick={(e) => { e.stopPropagation(); downloadResult(item.edited); }}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <ArrowDownTrayIcon className="w-3 h-3" /> Save Result
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass rounded-3xl p-6 bg-gradient-to-br from-blue-600/10 to-purple-600/10">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <InformationCircleIcon className="w-4 h-4 text-blue-400" />
                How Video Removal Works
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Unlike images, video watermarks are removed using <strong>generative restoration</strong>. Our AI (Veo 3.1) re-renders the scene based on your prompts to ensure consistency without the watermark overlay.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-6xl py-12 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6 mt-auto">
        <div className="flex items-center gap-4">
          <p className="text-gray-500 text-sm">© 2024 ClearCast AI.</p>
          <div className="h-4 w-[1px] bg-gray-800"></div>
          <p className="text-gray-500 text-sm">Gemini 2.5 Flash + Veo 3.1</p>
        </div>
        <div className="flex gap-8 text-sm text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">API Keys</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
