export interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
  completed?: boolean;
}

export interface RecordItem {
  id: string;
  title: string;
  date: string;
  duration: number; // in seconds
  points: string[]; // Bullet points transcribed from the audio/notes
  summary?: string;
  keyPoints?: string[];
  transcript?: string;
  languageHint?: string;
  actionItems?: ActionItem[];
  localOnly?: boolean;
  category?: "Engineering" | "Marketing" | "Infrastructure" | "Sales" | "General";
  isDeleted?: boolean;
  deletedAt?: string;
  emailDraft?: string;
  manualEntryText?: string;
  inputMode?: "audio" | "upload" | "manual";
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user?: User;
  token?: string;
  error?: string;
  alreadyExists?: boolean;
}
