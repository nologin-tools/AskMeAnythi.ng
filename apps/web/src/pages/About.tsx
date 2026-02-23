import { Component } from 'solid-js';
import StaticPageLayout from '../components/StaticPageLayout';

const features = [
  {
    title: 'Zero Friction',
    description: 'No sign-ups, no passwords, no accounts. Create a session and share the link — that\'s it.',
  },
  {
    title: 'Real-time Sync',
    description: 'Questions, votes, and answers update instantly for everyone via WebSocket connections.',
  },
  {
    title: 'Privacy-first',
    description: 'No cookies, no tracking, no analytics. Sessions auto-expire and data is permanently deleted.',
  },
  {
    title: 'Moderation',
    description: 'Approve or reject questions before they appear. Pin important ones to the top.',
  },
  {
    title: 'Projector Mode',
    description: 'A dedicated dark-themed view optimized for big screens, with keyboard shortcuts for navigation.',
  },
  {
    title: 'Open Source',
    description: 'Fully open source under MIT license. Inspect, modify, and self-host with confidence.',
  },
];

const steps = [
  { number: '1', title: 'Create', description: 'Start a new AMA session in one click. No account needed.' },
  { number: '2', title: 'Share', description: 'Send the session link to your audience via any channel.' },
  { number: '3', title: 'Engage', description: 'Receive questions, vote on favorites, and answer in real time.' },
];

const About: Component = () => {
  return (
    <StaticPageLayout>
      <div class="space-y-20">
        {/* Hero */}
        <section class="text-center">
          <h1 class="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
            About AskMe<span class="text-gray-400 font-light">Anything</span>
          </h1>
          <p class="text-lg text-gray-500 font-light max-w-xl mx-auto leading-relaxed">
            A disposable AMA platform built for simplicity. Host interactive Q&A sessions with zero setup — no accounts, no installation, no commitment.
          </p>
        </section>

        {/* Features */}
        <section>
          <h2 class="text-2xl font-bold tracking-tight text-center mb-10">What makes it different</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div class="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                <h3 class="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p class="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section>
          <h2 class="text-2xl font-bold tracking-tight text-center mb-10">How it works</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div class="text-center">
                <div class="w-10 h-10 rounded-full bg-gray-900 text-white text-lg font-bold flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                <h3 class="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p class="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section class="text-center">
          <a
            href="/"
            class="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-gray-900 text-white font-medium hover:bg-black hover:scale-105 transition-all duration-200"
          >
            Start a Session
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </section>
      </div>
    </StaticPageLayout>
  );
};

export default About;
