import { Component } from 'solid-js';
import StaticPageLayout from '../components/StaticPageLayout';

const contactChannels = [
  {
    label: 'Email',
    value: 'hi@askmeanythi.ng',
    href: 'mailto:hi@askmeanythi.ng',
    description: 'For general inquiries and support.',
    icon: (
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    value: 'nologin-tools/AskMeAnythi.ng',
    href: 'https://github.com/nologin-tools/AskMeAnythi.ng',
    description: 'Report bugs, request features, or contribute code.',
    icon: (
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    label: 'X (Twitter)',
    value: '@AskMeAnythi_ng',
    href: 'https://x.com/AskMeAnythi_ng',
    description: 'Follow for updates and announcements.',
    icon: (
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

const Contact: Component = () => {
  return (
    <StaticPageLayout>
      <div class="space-y-12">
        <header class="text-center">
          <h1 class="text-4xl font-bold tracking-tighter mb-4">Contact</h1>
          <p class="text-gray-500 font-light max-w-md mx-auto leading-relaxed">
            Have a question, found a bug, or want to contribute? Here's how to reach us.
          </p>
        </header>

        <div class="space-y-4">
          {contactChannels.map((channel) => (
            <a
              href={channel.href}
              target={channel.href.startsWith('mailto:') ? undefined : '_blank'}
              rel={channel.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
              class="flex items-start gap-4 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all group"
            >
              <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-colors shrink-0">
                {channel.icon}
              </div>
              <div>
                <div class="font-medium text-gray-900">{channel.label}</div>
                <div class="text-sm text-gray-500 mt-0.5">{channel.value}</div>
                <div class="text-sm text-gray-400 mt-1">{channel.description}</div>
              </div>
            </a>
          ))}
        </div>

        <div class="text-center text-sm text-gray-400 pt-4">
          <p>
            For bug reports and feature requests, please{' '}
            <a
              href="https://github.com/nologin-tools/AskMeAnythi.ng/issues"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-900 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900 transition-all"
            >
              open an issue on GitHub
            </a>.
          </p>
        </div>
      </div>
    </StaticPageLayout>
  );
};

export default Contact;
