"use server";

export async function fetchInstagramThumbnail(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    
    // Extract og:image meta tag
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }

    // Fallback: try twitter:image
    const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
    if (twitterImageMatch && twitterImageMatch[1]) {
      return twitterImageMatch[1];
    }

    return null;
  } catch (error) {
    console.error('[Thumbnail Fetch] Error:', error);
    return null;
  }
}
