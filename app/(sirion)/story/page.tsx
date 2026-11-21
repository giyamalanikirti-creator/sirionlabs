import fs from 'node:fs';
import path from 'node:path';
import { StoryView } from '@/components/story/StoryView';
import { shiftText } from '@/lib/demo/timeShift';

export default function StoryPage() {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), 'content', 'story.md'),
    'utf8',
  );
  // The story runs on today's calendar: dates written in the case move with it.
  return <StoryView markdown={shiftText(markdown)} />;
}
