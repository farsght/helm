"use client"

import { motion } from "framer-motion"
import { BrainCircuitIcon, EyeIcon, PlayIcon, WrenchIcon } from "lucide-react"
import Balancer from "react-wrap-balancer"
import { Badge } from "@/components/ui/badge"

const steps = [
  { type: "thought", content: "The user wants to know the current weather in San Francisco. I need to use the weather tool.", timestamp: "0ms" },
  { type: "action", content: "get_weather(location='San Francisco')", timestamp: "+120ms" },
  { type: "observation", content: "Current weather in SF is 62°F and sunny.", timestamp: "+450ms" },
  { type: "thought", content: "I have the weather info. Now I can formulate the final answer.", timestamp: "+480ms" },
]

export default function MonitoringAgentReasoningLog() {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.05 }
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="overflow-hidden rounded-lg border bg-card"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-purple-500/10">
              <BrainCircuitIcon className="size-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium leading-none">Agent Reasoning</h3>
              <p className="mt-1 text-muted-foreground text-xs">
                <Balancer>Session: sess_af21_agent_01</Balancer>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] h-5 font-normal">STEP 4/10</Badge>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`flex size-6 items-center justify-center rounded border ${
                    step.type === 'thought' ? 'bg-purple-500/5 border-purple-500/20' : 
                    step.type === 'action' ? 'bg-amber-500/5 border-amber-500/20' : 
                    'bg-blue-500/5 border-blue-500/20'
                  }`}>
                    {step.type === 'thought' ? <BrainCircuitIcon className="size-3 text-purple-600" /> : 
                     step.type === 'action' ? <WrenchIcon className="size-3 text-amber-600" /> : 
                     <EyeIcon className="size-3 text-blue-600" />}
                  </div>
                  {i !== steps.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{step.type}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{step.timestamp}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    <Balancer>{step.content}</Balancer>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-muted/30 flex items-center justify-between border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PlayIcon className="size-3 fill-emerald-500 text-emerald-500" />
            <span className="font-medium">Final Answer Generated</span>
          </div>
          <button type="button" className="text-[10px] font-medium hover:underline text-foreground">
            Debug Session →
          </button>
        </div>
      </motion.div>
    </section>
  )
}
