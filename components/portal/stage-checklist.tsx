"use client";

import { Stepper, StepperIndicator, StepperItem, StepperLabel, StepperList, StepperTrigger } from "@/components/ui/stepper";
import { clientStageLabel, clientStages, type ClientStage } from "@/lib/client-home";

const steps = clientStages.map((value) => ({ value }));

export function StageChecklist({ stage }: { stage: ClientStage }) {
  const current = clientStages.indexOf(stage);

  return (
    <Stepper value={stage} steps={steps} orientation="horizontal">
      <StepperList aria-label="Return progress">
        {clientStages.map((id, index) => (
          <StepperItem key={id} value={id} completed={index < current} defaultTrigger={false}>
            <StepperTrigger onClick={(event) => event.preventDefault()}>
              <StepperIndicator />
              <StepperLabel>{clientStageLabel(id)}</StepperLabel>
            </StepperTrigger>
          </StepperItem>
        ))}
      </StepperList>
    </Stepper>
  );
}
