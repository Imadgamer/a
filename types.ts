
export interface Source {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  sources?: Source[];
}
