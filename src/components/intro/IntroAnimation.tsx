import { useCallback, useEffect, useRef, useState } from 'react';
import { SkipForward } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [isFading, setIsFading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFading(true);
    setTimeout(() => {
      onComplete();
    }, 650);
  }, [onComplete]);

  const handleError = useCallback(() => {
    setHasError(true);
    // Automatically proceed to application if video cannot be loaded/played
    const timer = setTimeout(() => {
      handleFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [handleFinish]);

  // Ensure autoplay works across modern browsers by setting muted property directly
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        // Autoplay may require user gesture on strict environments; allow user to click Skip
      });
    }
  }, []);

  // Keyboard shortcut: Escape, Space or Enter skips the intro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex h-screen w-screen items-center justify-center overflow-hidden bg-[#080D18] select-none transition-opacity duration-700 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="region"
      aria-label="Cinematic Startup Intro"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleFinish}
        onError={handleError}
        className="h-full w-full object-cover"
      >
        <source src="/videos/intro.mp4" type="video/mp4" />
        <source src="/intro.mp4.mp4" type="video/mp4" />
        Your browser does not support video playback.
      </video>

      {/* Minimal Skip Intro Control */}
      <button
        type="button"
        onClick={handleFinish}
        className="group absolute bottom-5 right-5 z-10 flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-[#101a2a]/85 px-3.5 py-2 text-xs font-medium text-cyan-300 shadow-[0_4px_24px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-200 hover:border-cyan-400/60 hover:bg-[#172438]/95 hover:text-cyan-200 hover:shadow-[0_0_16px_rgba(85,201,214,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-95 sm:bottom-8 sm:right-8"
        aria-label="Skip intro animation"
      >
        <span>{hasError ? 'Enter NeuroVerse' : 'Skip Intro'}</span>
        <SkipForward className="h-3.5 w-3.5 text-cyan-400 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
