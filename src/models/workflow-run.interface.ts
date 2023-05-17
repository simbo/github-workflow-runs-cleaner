export interface WorkflowRun {
  id: number;
  name: string;
  run_number: number;
  event: string;
  created_at: string;
  actor: {
    login: string;
  };
}
