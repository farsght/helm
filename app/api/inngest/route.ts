import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { pipelineRunFunction } from '@/lib/inngest/functions/pipeline-run';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pipelineRunFunction],
});
