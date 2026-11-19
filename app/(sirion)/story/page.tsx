import fs from 'node:fs';
import path from 'node:path';
import { StoryView } from '@/components/story/StoryView';

export default function StoryPage() {
  const markdown = fs.readFileSync(
    path.join(process.cwd(), 'content', 'story.md'),
    'utf8',
  );
  return <StoryView markdown={markdown} />;
}
