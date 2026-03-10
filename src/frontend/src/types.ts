export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  createdAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  seen: boolean;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string;
  members: string[];
  createdAt: number;
}

export interface ActiveUser {
  id: string;
  name: string;
  city: string;
  lastSeen: number;
}
