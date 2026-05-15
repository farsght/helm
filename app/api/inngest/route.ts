// Each Inngest step (classify_meeting, embed, etc.) runs as a callback
// into this route. LLM calls can take 60s+ per step.
export const maxDuration = 300; // 5 min (Hobby max, Pro can go to 800)

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { pipelineRunFunction } from '@/lib/inngest/functions/pipeline-run';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pipelineRunFunction],
});
