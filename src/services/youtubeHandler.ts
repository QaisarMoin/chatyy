// YouTube video handling functionality
let lastVideoId: string | null = null;

// Import the persistent logger
import { persistentLogger } from '../utils/logger';

// Get video ID from URL query param "v"
export function getCurrentVideoId(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('v');
  } catch {
    return null;
  }
}

// Extract ytInitialPlayerResponse from global or fallback to script parsing
export function getPlayerResponse(): any | null {
  // First try the global variable
  if (typeof window !== 'undefined' && (window as any).ytInitialPlayerResponse) {
    return (window as any).ytInitialPlayerResponse;
  }

  // Fallback: Try extracting from script tags
  const scripts = Array.from(document.querySelectorAll('script'));
  for (const script of scripts) {
    const text = script.textContent || '';
    if (text.includes('ytInitialPlayerResponse')) {
      const match = text.match(/ytInitialPlayerResponse\s*=\s*({.*?});/s);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// Fetch and parse transcript
export async function fetchTranscript(playerResponse: any): Promise<string | null> {
  try {
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      persistentLogger.error('No captions available');
      return null;
    }

    const transcriptUrl = captionTracks[0].baseUrl;
    if (!transcriptUrl) {
      persistentLogger.error('Transcript URL missing');
      return null;
    }

    const res = await fetch(transcriptUrl);
    if (!res.ok) {
      persistentLogger.error('Failed to fetch transcript XML');
      return null;
    }

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const texts = Array.from(xmlDoc.getElementsByTagName('text'));
    return texts.map(t => t.textContent?.replace(/\n/g, ' ') || '').join(' ') || null;
  } catch (e) {
    persistentLogger.error('Error fetching transcript:', e);
    return null;
  }
}

// Generate summary from text
export async function getSummary(text: string): Promise<string> {
  try {
    persistentLogger.log('Processing text for summary...');
    persistentLogger.log('Text length:', text.length);
    
    // Simple text processing - take first 200 characters and add ellipsis
    const summary = text.length > 200 
      ? text.substring(0, 200) + '...' 
      : text;
    
    persistentLogger.log('Generated summary:', summary);
    return summary;
  } catch (error: any) {
    persistentLogger.error('Error processing text:', {
      name: error?.name || 'Unknown error',
      message: error?.message || 'No error message'
    });
    return 'Error processing text. Please try again.';
  }
}

// Main video processing function
export async function processVideo() {
  persistentLogger.log('Starting processVideo function...');
  
  const videoId = getCurrentVideoId();
  persistentLogger.log('Current video ID:', videoId);
  
  if (!videoId) {
    persistentLogger.error('No video ID in URL');
    return;
  }
  if (videoId === lastVideoId) {
    persistentLogger.log(`⏭ Same video (${videoId}), skipping`);
    return;
  }

  lastVideoId = videoId;
  persistentLogger.log('▶ Processing video:', videoId);

  const playerResponse = getPlayerResponse();
  persistentLogger.log('Player response received:', !!playerResponse);
  
  if (!playerResponse) {
    persistentLogger.error('ytInitialPlayerResponse not found');
    return;
  }

  persistentLogger.log('Attempting to fetch transcript...');
  const transcript = await fetchTranscript(playerResponse);
  persistentLogger.log('Transcript received:', !!transcript);
  
  if (!transcript) {
    persistentLogger.error('Transcript not found or empty');
    return;
  }

  persistentLogger.log('%c📜 Transcript:', 'color: #4CAF50; font-weight: bold;', transcript);

  persistentLogger.log('Generating summary...');
  const summary = await getSummary(transcript);
  persistentLogger.log('%c📌 Summary:', 'color: #2196F3; font-weight: bold;', summary);
}

// Initialize YouTube handling
export function initializeYouTubeHandling() {
  persistentLogger.log('Initializing YouTube handling...');
  
  // Process initial video
  persistentLogger.log('Setting up initial video processing...');
  setTimeout(() => {
    persistentLogger.log('Running initial video processing...');
    processVideo();
  }, 1500);

  // React to YouTube SPA navigation event
  persistentLogger.log('Setting up yt-navigate-finish listener...');
  window.addEventListener('yt-navigate-finish', () => {
    persistentLogger.log('🔄 yt-navigate-finish detected');
    setTimeout(() => {
      persistentLogger.log('Processing video after navigation...');
      processVideo();
    }, 1500);
  });

  // Fallback for URL change detection using MutationObserver
  persistentLogger.log('Setting up URL change observer...');
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      persistentLogger.log('🔄 URL changed detected by MutationObserver');
      setTimeout(() => {
        persistentLogger.log('Processing video after URL change...');
        processVideo();
      }, 1500);
    }
  });
  observer.observe(document, { subtree: true, childList: true });
  persistentLogger.log('YouTube handling initialization complete');

  // Add a command to view logs in the console
  (window as any).viewYoutubeHandlerLogs = async () => {
    const logs = await persistentLogger.getLogs();
    console.log('=== YouTube Handler Logs ===');
    logs.forEach(log => console.log(log));
    console.log('==========================');
  };
} 