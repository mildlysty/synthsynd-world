import type { Metadata } from 'next';
import WorkflowsExperience from '../components/WorkflowsExperience';

export const metadata: Metadata = {
  title: 'Workflows — Synthsynd World',
  description: 'Build, use, and share workflows from community-built AI agents, prompts, tools, and skills.',
};

export default function WorkflowsPage() {
  return <WorkflowsExperience />;
}
