// YouTube video handling functionality
let lastVideoId: string | null = null;

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
      console.log('❌ No captions available');
      return null;
    }

    const transcriptUrl = captionTracks[0].baseUrl;
    if (!transcriptUrl) {
      console.log('❌ Transcript URL missing');
      return null;
    }

    const res = await fetch(transcriptUrl);
    if (!res.ok) {
      console.log('❌ Failed to fetch transcript XML');
      return null;
    }

    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const texts = Array.from(xmlDoc.getElementsByTagName('text'));
    return texts.map(t => t.textContent?.replace(/\n/g, ' ') || '').join(' ') || null;
  } catch (e) {
    console.error('❌ Error fetching transcript:', e);
    return null;
  }
}

// Generate summary from text
export async function getSummary(text: string): Promise<string> {
  try {
    console.log('Processing text for summary...');
    console.log('Text length:', text.length);
    
    // Simple text processing - take first 200 characters and add ellipsis
    const summary = text.length > 200 
      ? text.substring(0, 200) + '...' 
      : text;
    
    console.log('Generated summary:', summary);
    return summary;
  } catch (error: any) {
    console.error('Error processing text:', {
      name: error?.name || 'Unknown error',
      message: error?.message || 'No error message'
    });
    return 'Error processing text. Please try again.';
  }
}

// Main video processing function
export async function processVideo() {
  console.log('Starting processVideo function...');
  
  const videoId = getCurrentVideoId();
  console.log('Current video ID:', videoId);
  
  if (!videoId) {
    console.log('❌ No video ID in URL');
    return;
  }
  if (videoId === lastVideoId) {
    console.log(`⏭ Same video (${videoId}), skipping`);
    return;
  }

  lastVideoId = videoId;
  console.log('▶ Processing video:', videoId);

  const playerResponse = getPlayerResponse();
  console.log('Player response received:', !!playerResponse);
  
  if (!playerResponse) {
    console.log('❌ ytInitialPlayerResponse not found');
    return;
  }

  console.log('Attempting to fetch transcript...');
  const transcript = await fetchTranscript(playerResponse);
  console.log('Transcript received:', !!transcript);
  
  if (!transcript) {
    console.log('❌ Transcript not found or empty');
    return;
  }

  console.log('%c📜 Transcript:', 'color: #4CAF50; font-weight: bold;', transcript);

  console.log('Generating summary...');
  const summary = await getSummary(transcript);
  console.log('%c📌 Summary:', 'color: #2196F3; font-weight: bold;', summary);
}

// Initialize YouTube handling
export function initializeYouTubeHandling() {
  console.log('Initializing YouTube handling...');
  
  // Process initial video
  console.log('Setting up initial video processing...');
  setTimeout(() => {
    console.log('Running initial video processing...');
    processVideo();
  }, 1500);

  // React to YouTube SPA navigation event
  console.log('Setting up yt-navigate-finish listener...');
  window.addEventListener('yt-navigate-finish', () => {
    console.log('🔄 yt-navigate-finish detected');
    setTimeout(() => {
      console.log('Processing video after navigation...');
      processVideo();
    }, 1500);
  });

  // Fallback for URL change detection using MutationObserver
  console.log('Setting up URL change observer...');
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('🔄 URL changed detected by MutationObserver');
      setTimeout(() => {
        console.log('Processing video after URL change...');
        processVideo();
      }, 1500);
    }
  });
  observer.observe(document, { subtree: true, childList: true });
  console.log('YouTube handling initialization complete');
} 