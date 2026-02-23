import { Component } from 'solid-js';
import StaticPageLayout from '../components/StaticPageLayout';

const Privacy: Component = () => {
  return (
    <StaticPageLayout>
      <article class="space-y-10">
        <header>
          <h1 class="text-4xl font-bold tracking-tighter mb-2">Privacy Policy</h1>
          <p class="text-sm text-gray-400">Last updated: February 2026</p>
        </header>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">Overview</h2>
          <p class="text-gray-600 leading-relaxed">
            AskMeAnything (<strong class="text-gray-900">askmeanythi.ng</strong>) is a disposable Q&A platform designed with privacy at its core. We collect the absolute minimum amount of data needed to provide the service, and all data is automatically deleted when sessions expire.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">Information We Collect</h2>
          <p class="text-gray-600 leading-relaxed">When you use AskMeAnything, the following data may be stored:</p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 leading-relaxed">
            <li><strong class="text-gray-900">Visitor ID</strong> — A randomly generated UUID stored in your browser's localStorage. This is used to associate your votes and questions within a session. It is never linked to your identity.</li>
            <li><strong class="text-gray-900">Question content</strong> — The text of questions you submit to a session.</li>
            <li><strong class="text-gray-900">Display name</strong> — An optional name you may provide when asking a question.</li>
            <li><strong class="text-gray-900">Votes and reactions</strong> — Records of your votes and emoji reactions within a session.</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">Information We Do Not Collect</h2>
          <ul class="list-disc list-inside text-gray-600 space-y-2 leading-relaxed">
            <li>No user accounts or registration data</li>
            <li>No email addresses or phone numbers</li>
            <li>No cookies (we use localStorage only)</li>
            <li>No third-party analytics or tracking scripts</li>
            <li>No IP address logging at the application level</li>
            <li>No advertising or marketing data</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">How We Use Your Data</h2>
          <p class="text-gray-600 leading-relaxed">
            Data is used solely to operate the Q&A session you participate in. This includes displaying questions, recording votes, and enabling real-time updates. We do not use your data for any other purpose.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">Data Storage and Retention</h2>
          <p class="text-gray-600 leading-relaxed">
            All data is stored on Cloudflare's infrastructure (D1 database and Durable Objects). Sessions have a configurable TTL (time-to-live) of 1–7 days. When a session expires, all associated data — including questions, answers, votes, and reactions — is permanently and automatically deleted by a scheduled cleanup process.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">Data Sharing</h2>
          <p class="text-gray-600 leading-relaxed">
            We do not sell, share, or transfer your data to any third parties. The only infrastructure provider with access to stored data is Cloudflare, which processes data in accordance with their own privacy policy.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">Your Rights</h2>
          <p class="text-gray-600 leading-relaxed">
            Since we do not collect personal information or maintain user accounts, there is no profile to delete or data to export. Session data is automatically purged after expiry. If you have specific concerns, you can reach us at the contact information provided on our <a href="/contact" class="text-gray-900 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900 transition-all">Contact</a> page.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">Open Source Transparency</h2>
          <p class="text-gray-600 leading-relaxed">
            AskMeAnything is fully open source. You can audit every line of code to verify our privacy practices at{' '}
            <a href="https://github.com/nologin-tools/AskMeAnythi.ng" target="_blank" rel="noopener noreferrer" class="text-gray-900 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900 transition-all">
              github.com/nologin-tools/AskMeAnythi.ng
            </a>.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">Changes to This Policy</h2>
          <p class="text-gray-600 leading-relaxed">
            We may update this policy from time to time. Changes will be reflected on this page with an updated revision date. Since we do not collect email addresses, we cannot notify users directly — please check this page periodically.
          </p>
        </section>
      </article>
    </StaticPageLayout>
  );
};

export default Privacy;
