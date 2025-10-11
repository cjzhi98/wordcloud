export interface Session {
  id: string;
  title: string;
  description: string;
  creator_name: string;
  public_url: string;
  created_at: string;
}

export interface Entry {
  id: string;
  session_id: string;
  text: string;
  normalized_text: string;
  color: string;
  participant_name: string;
  created_at: string;
}

export interface WordCloudWord {
  text: string;
  normalizedText: string;
  count: number;
  color: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
}

export interface CreateSessionData {
  title: string;
  description: string;
  creator_name: string;
}

export interface CreateEntryData {
  session_id: string;
  text: string;
  color: string;
  participant_name: string;
}
