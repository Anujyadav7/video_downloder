// Cobalt API Response Types

export interface CobaltResponse {
  status: "stream" | "redirect" | "picker" | "error" | "tunnel";
  url?: string;
  filename?: string;
  text?: string; // Error message or description
  error?: string; // API error message
  picker?: CobaltPickerItem[];
  thumb?: string; // Sometimes returned for single videos
  audio?: string; // Audio URL for picker responses
}

export interface CobaltPickerItem {
  url: string;
  type: "photo" | "video";
  thumb?: string;
}

export interface DownloadResult {
  thumbnail: string | null;
  title: string;
  type: string;
  url: string;
  downloadUrl?: string; // Proxied URL for frontend use
  rawMediaUrl?: string; // Original unproxied URL from API
  picker?: CobaltPickerItem[]; // For photo carousels
  isAudio?: boolean;
}
