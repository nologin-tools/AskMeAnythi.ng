import { Component } from 'solid-js';
import StaticPageLayout from '../components/StaticPageLayout';

const Terms: Component = () => {
  return (
    <StaticPageLayout>
      <article class="space-y-10">
        <header>
          <h1 class="text-4xl font-bold tracking-tighter mb-2">Terms of Service</h1>
          <p class="text-sm text-gray-400">Last updated: February 2026</p>
        </header>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">1. Service Description</h2>
          <p class="text-gray-600 leading-relaxed">
            AskMeAnything (<strong class="text-gray-900">askmeanythi.ng</strong>) is an open-source, disposable Q&A platform that allows users to host real-time AMA (Ask Me Anything) sessions without registration. Sessions are temporary and automatically expire after a configurable period (1–7 days).
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">2. Acceptance of Terms</h2>
          <p class="text-gray-600 leading-relaxed">
            By accessing or using AskMeAnything, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">3. Acceptable Use</h2>
          <p class="text-gray-600 leading-relaxed">You agree not to use AskMeAnything to:</p>
          <ul class="list-disc list-inside text-gray-600 space-y-2 leading-relaxed">
            <li>Post illegal, harmful, threatening, abusive, or harassing content</li>
            <li>Distribute spam, malware, or phishing content</li>
            <li>Impersonate any person or entity</li>
            <li>Attempt to gain unauthorized access to the service or its infrastructure</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Collect personal information of other users without consent</li>
            <li>Use the service for any purpose that violates applicable laws</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">4. User Content</h2>
          <p class="text-gray-600 leading-relaxed">
            You retain ownership of any content you submit (questions, answers, etc.). By posting content, you grant AskMeAnything a non-exclusive, temporary license to display that content within the session for the duration of its existence. All content is automatically deleted when the session expires.
          </p>
          <p class="text-gray-600 leading-relaxed">
            Session administrators have the ability to moderate content, including approving, rejecting, or deleting questions within their sessions.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">5. No Warranty</h2>
          <p class="text-gray-600 leading-relaxed">
            AskMeAnything is provided <strong class="text-gray-900">"AS IS"</strong> and <strong class="text-gray-900">"AS AVAILABLE"</strong> without warranties of any kind, whether express or implied. We do not guarantee that the service will be uninterrupted, error-free, or secure. We make no warranties regarding the accuracy or reliability of any content obtained through the service.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">6. Limitation of Liability</h2>
          <p class="text-gray-600 leading-relaxed">
            To the fullest extent permitted by law, AskMeAnything and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, or business interruption, arising from your use of or inability to use the service.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">7. Data and Privacy</h2>
          <p class="text-gray-600 leading-relaxed">
            Your use of AskMeAnything is also governed by our{' '}
            <a href="/privacy" class="text-gray-900 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900 transition-all">Privacy Policy</a>,
            which describes how we handle data. By using the service, you acknowledge that you have read and understood our Privacy Policy.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">8. Service Modifications</h2>
          <p class="text-gray-600 leading-relaxed">
            We reserve the right to modify, suspend, or discontinue the service at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the service.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">9. Changes to Terms</h2>
          <p class="text-gray-600 leading-relaxed">
            We may update these Terms of Service from time to time. Changes will be posted on this page with an updated revision date. Your continued use of the service after changes are posted constitutes acceptance of the modified terms.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold tracking-tight">10. Contact</h2>
          <p class="text-gray-600 leading-relaxed">
            If you have questions about these terms, please visit our{' '}
            <a href="/contact" class="text-gray-900 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900 transition-all">Contact</a> page.
          </p>
        </section>
      </article>
    </StaticPageLayout>
  );
};

export default Terms;
