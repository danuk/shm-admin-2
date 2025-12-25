import ttSnippetsData from './ttSnippets.json';

export interface TTSnippet {
  prefix: string | string[];
  body: string | string[];
  description?: string;
}

const ttSnippets = ttSnippetsData as Record<string, TTSnippet>;

export default ttSnippets;
