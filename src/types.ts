export interface RecordItem {
  id: string;
  title: string;
  date: string;
  duration: number; // in seconds
  points: string[]; // Bullet points transcribed from the audio
  summary?: string;
  keyPoints?: string[];
  transcript?: string;
  languageHint?: string;
}
