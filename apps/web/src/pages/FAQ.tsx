import { Component, createSignal, For } from 'solid-js';
import StaticPageLayout from '../components/StaticPageLayout';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'What is AskMeAnything?',
    answer: 'AskMeAnything is a disposable, real-time Q&A platform. It lets you host interactive AMA sessions where your audience can submit questions, vote on their favorites, and get answers — all without any registration or setup.',
  },
  {
    question: 'Do I need to create an account?',
    answer: 'No. AskMeAnything requires zero registration. You can create a session instantly and share the link with your audience. Participants can ask questions and vote without signing up either.',
  },
  {
    question: 'How long does session data last?',
    answer: 'Sessions have a configurable time-to-live (TTL) of 1 to 7 days. Once a session expires, all associated data — questions, answers, votes, and reactions — is permanently and automatically deleted.',
  },
  {
    question: 'How do I share a session with my audience?',
    answer: 'After creating a session, you\'ll receive an admin link. The public session URL (e.g., askmeanythi.ng/s/abc12) can be shared via any channel — social media, chat, email, or displayed on screen. Anyone with the link can participate.',
  },
  {
    question: 'Can I moderate questions?',
    answer: 'Yes. As a session admin, you can approve or reject submitted questions before they become visible to others. You can also pin important questions to the top of the list and delete questions at any time.',
  },
  {
    question: 'What is Projector Mode?',
    answer: 'Projector Mode is a dedicated dark-themed view optimized for displaying on big screens during live events. It supports keyboard shortcuts for navigating between questions and provides a clean, distraction-free display.',
  },
  {
    question: 'Are there limits on the number of questions?',
    answer: 'Session admins can optionally configure per-visitor question limits (total cap and rate limiting). By default, there are no limits. These settings help prevent spam in larger sessions.',
  },
  {
    question: 'Do you collect personal data?',
    answer: 'We collect the absolute minimum: a randomly generated visitor ID (stored locally in your browser), question text, and an optional display name. We don\'t use cookies, analytics, or any third-party tracking. See our Privacy Policy for full details.',
  },
  {
    question: 'Is AskMeAnything open source?',
    answer: 'Yes! AskMeAnything is fully open source under the MIT license. You can view, audit, and contribute to the code on GitHub at github.com/nologin-tools/AskMeAnythi.ng.',
  },
  {
    question: 'Can I self-host AskMeAnything?',
    answer: 'Yes. AskMeAnything runs on Cloudflare Workers, D1, and Durable Objects. You can fork the repository, configure your own Cloudflare account, and deploy it to your own infrastructure. See the README on GitHub for deployment instructions.',
  },
];

const FAQAccordionItem: Component<{ item: FAQItem }> = (props) => {
  const [open, setOpen] = createSignal(false);

  return (
    <div class="border-b border-gray-100 last:border-b-0">
      <button
        class="w-full flex items-center justify-between py-5 text-left group"
        onClick={() => setOpen(!open())}
      >
        <span class="font-medium text-gray-900 group-hover:text-black transition-colors pr-4">
          {props.item.question}
        </span>
        <svg
          class={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${open() ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        class={`overflow-hidden transition-all duration-200 ${open() ? 'max-h-96 pb-5' : 'max-h-0'}`}
      >
        <p class="text-gray-600 leading-relaxed text-sm">{props.item.answer}</p>
      </div>
    </div>
  );
};

const FAQ: Component = () => {
  return (
    <StaticPageLayout>
      <div class="space-y-10">
        <header class="text-center">
          <h1 class="text-4xl font-bold tracking-tighter mb-4">Frequently Asked Questions</h1>
          <p class="text-gray-500 font-light">
            Everything you need to know about AskMeAnything.
          </p>
        </header>

        <div class="border-t border-gray-100">
          <For each={faqItems}>
            {(item) => <FAQAccordionItem item={item} />}
          </For>
        </div>

        <div class="text-center pt-4">
          <p class="text-gray-500 text-sm mb-4">
            Still have questions?
          </p>
          <a
            href="/contact"
            class="inline-flex items-center gap-2 text-sm text-gray-900 font-medium hover:underline underline-offset-4"
          >
            Get in touch
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </StaticPageLayout>
  );
};

export default FAQ;
