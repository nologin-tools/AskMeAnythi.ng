import { Route } from '@solidjs/router';
import { lazy } from 'solid-js';

// 懒加载页面
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Contact = lazy(() => import('./pages/Contact'));
const SessionAdmin = lazy(() => import('./pages/SessionAdmin'));
const SessionPublic = lazy(() => import('./pages/SessionPublic'));
const SessionProjector = lazy(() => import('./pages/SessionProjector'));
const SessionEnded = lazy(() => import('./pages/SessionEnded'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />
      <Route path="/s/:id/admin" component={SessionAdmin} />
      <Route path="/s/:id/projector" component={SessionProjector} />
      <Route path="/s/:id/ended" component={SessionEnded} />
      <Route path="/s/:id" component={SessionPublic} />
      <Route path="*" component={NotFound} />
    </>
  );
}
