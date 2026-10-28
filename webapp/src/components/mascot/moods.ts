import type { MascotMood } from '../../engine/types';

export interface MoodMeta {
  label: string;
  hindi: string;
  color: string;
  emojis: string[];
  blurb: string;
}

export const MOOD_META: Record<MascotMood, MoodMeta> = {
  idle: {
    label: 'Scanning',
    hindi: 'Chowkasi',
    color: '#3aa8e8',
    emojis: ['🛰️'],
    blurb: 'Market structure scan kar raha hoon',
  },
  sleeping: {
    label: 'Sleeping',
    hindi: 'So raha hai',
    color: '#6f86b4',
    emojis: ['😴', '💤'],
    blurb: 'Dead market — energy save kar raha hoon',
  },
  thinking: {
    label: 'Thinking',
    hindi: 'Soch-vichaar',
    color: '#d8bd55',
    emojis: ['🤔', '❓'],
    blurb: 'Confluence calculate ho raha hai…',
  },
  happy: {
    label: 'Happy',
    hindi: 'Khush',
    color: '#1db886',
    emojis: ['😊', '✨'],
    blurb: 'Positions profit mein green dikh rahe hain',
  },
  celebrating: {
    label: 'Celebrating',
    hindi: 'Jashn',
    color: '#7bc96f',
    emojis: ['🎉', '✨', '🚀'],
    blurb: 'Target hit! Victory lap le raha hoon',
  },
  sad: {
    label: 'Sad',
    hindi: 'Dukhi',
    color: '#7aa7d9',
    emojis: ['😢', '💧'],
    blurb: 'Stop-loss hit hua — lesson log ho raha hai',
  },
  angry: {
    label: 'Angry',
    hindi: 'Gussa',
    color: '#e5536b',
    emojis: ['💢', '😠'],
    blurb: 'Drawdown threat — defensive posture ON',
  },
  alert: {
    label: 'Hyper-Alert',
    hindi: 'Satark',
    color: '#e0a52f',
    emojis: ['⚡', '🚨'],
    blurb: 'Whale / Gamma Blast detected — armor mode',
  },
  zen: {
    label: 'Zen Meditation',
    hindi: 'Dhyan',
    color: '#8f7fe0',
    emojis: ['🧘', '🪷'],
    blurb: 'Emotional lockout — calm breathing session',
  },
};
