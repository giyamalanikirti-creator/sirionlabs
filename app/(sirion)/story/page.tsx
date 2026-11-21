import fs from 'node:fs';
import path from 'node:path';
import { StoryView } from '@/components/story/StoryView';
import { shiftText } from '@/lib/demo/timeShift';

export default function StoryPage() {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), 'content', 'story.md'),
    'utf8',
  );
  // The story runs on today's calendar: dates written in the case move with it,
  // except dates marked {{keep:…}} (publication dates, past quarters).
  const kept: string[] = [];
  const guarded = markdown.replace(/\{\{keep:([^}]+)\}\}/g, (_, t: string) => `\u0000${kept.push(t) - 1}\u0000`);
  const shifted = shiftText(guarded).replace(/\u0000(\d+)\u0000/g, (_, i: string) => kept[Number(i)]);
  return <StoryView markdown={shifted} />;
}
