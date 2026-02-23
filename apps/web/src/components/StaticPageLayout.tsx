import { Component, JSX } from 'solid-js';
import Logo from './Logo';

interface StaticPageLayoutProps {
  children: JSX.Element;
}

const navLinks = [
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/contact', label: 'Contact' },
];

const StaticPageLayout: Component<StaticPageLayoutProps> = (props) => {
  return (
    <div class="min-h-screen flex flex-col bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header class="py-6 px-6 md:px-12 flex items-center justify-between border-b border-gray-100">
        <Logo size="md" />
        <nav class="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              href={link.href}
              class="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main class="flex-1 w-full max-w-3xl mx-auto px-6 py-12 md:py-16">
        {props.children}
      </main>

      {/* Footer */}
      <footer class="py-10 text-center text-sm text-gray-400 border-t border-gray-100">
        <div class="max-w-6xl mx-auto px-6 flex flex-col gap-4">
          <nav class="flex flex-wrap justify-center gap-4">
            {navLinks.map((link) => (
              <a
                href={link.href}
                class="text-gray-400 hover:text-gray-900 transition-colors text-xs"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div class="flex items-center justify-center gap-3 text-xs">
            <span>&copy; 2026 askmeanythi.ng</span>
            <span class="text-gray-200">&middot;</span>
            <a
              href="https://github.com/nologin-tools/AskMeAnythi.ng"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-400 hover:text-gray-900 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StaticPageLayout;
