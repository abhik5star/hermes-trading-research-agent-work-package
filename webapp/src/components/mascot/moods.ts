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
    color: '#38e8ff',
    emojis: ['🛰️'],
    blurb: 'Market structure scan kar raha hoon',
  },
  sleeping: {
    label: 'Sleeping',
    hindi: 'So raha hai',
    color: '#5b7bb4',
    emojis: ['😴', '💤'],
    blurb: 'Dead market — energy save kar raha hoon',
  },
  thinking: {
    label: 'Thinking',
    hindi: 'Soch-vichaar',
    color: '#ffd84d',
    emojis: ['🤔', '❓'],
    blurb: 'Confluence calculate ho raha hai…',
  },
  happy: {
    label: 'Happy',
    hindi: 'Khush',
    color: '#2dffb0',
    emojis: ['😊', '✨'],
    blurb: 'Positions profit mein green dikh rahe hain',
  },
  celebrating: {
    label: 'Celebrating',
    hindi: 'Jashn',
    color: '#a6ff3d',
    emojis: ['🎉', '✨', '🚀'],
    blurb: 'Target hit! Victory lap le raha hoon',
  },
  sad: {
    label: 'Sad',
    hindi: 'Dukhi',
    color: '#6fb3ff',
    emojis: ['😢', '💧'],
    blurb: 'Stop-loss hit hua — lesson log ho raha hai',
  },
  angry: {
    label: 'Angry',
    hindi: 'Gussa',
    color: '#ff3b57',
    emojis: ['💢', '😠'],
    blurb: 'Drawdown threat — defensive posture ON',
  },
  alert: {
    label: 'Hyper-Alert',
    hindi: 'Satark',
    color: '#ffae3b',
    emojis: ['⚡', '🚨'],
    blurb: 'Whale / Gamma Blast detected — armor mode',
  },
  zen: {
    label: 'Zen Meditation',
    hindi: 'Dhyan',
    color: '#b4a6ff',
    emojis: ['🧘', '🪷'],
    blurb: 'Emotional lockout — calm breathing session',
  },
};
