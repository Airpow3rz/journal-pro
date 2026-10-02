// Rendu markdown des notes, nettoyé contre toute injection HTML.
import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

export const renderMarkdown = (md: string) => DOMPurify.sanitize(marked.parse(md, { async: false }) as string);
