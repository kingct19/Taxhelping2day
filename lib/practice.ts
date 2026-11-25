export function letterBeforeIntake(): boolean {
  return process.env.ENGAGEMENT_LETTER_BEFORE_INTAKE === "1";
}
