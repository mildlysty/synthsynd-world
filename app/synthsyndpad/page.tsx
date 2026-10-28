import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Workflows — Synthsynd World',
  description: 'Build and share a practical workflow from community agents, prompts, tools, and skills.',
};

export default function SynthsyndPadPage() {
  redirect('/workflows');
}
