import { useEffect, useRef } from 'react';
import atelierLandingHtml from '../../../docs/design/open-design-landing/open-finance-atelier-landing.html?raw';

const ASSET_PUBLIC_PATH = '/open-design-assets/';

function extractSourcePart(pattern, fallback = '') {
  return atelierLandingHtml.match(pattern)?.[1] ?? fallback;
}

function buildExactLanding() {
  const styles = `${extractSourcePart(/<style>([\s\S]*?)<\/style>/)}
    @media (max-width: 780px) {
      [data-reveal], [data-reveal="right"] {
        opacity: 1;
        transform: none;
      }
    }`;
  const body = extractSourcePart(/<body[^>]*>([\s\S]*?)<\/body>/)
    .replace(/<script>[\s\S]*?<\/script>/g, '')
    .replaceAll('src="assets/', `src="${ASSET_PUBLIC_PATH}`)
    .replaceAll(
      'href="https://open-finance.ai" target="_blank" rel="noreferrer noopener"',
      'href="/app"'
    )
    .replaceAll('href="https://open-finance.ai"', 'href="/app"');

  return { styles, body };
}

const exactLanding = buildExactLanding();

export default function OpenFinanceLanding() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const cleanup = [];

    const revealElements = Array.from(root.querySelectorAll('[data-reveal]:not([data-revealed])'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth <= 780) {
      revealElements.forEach((el) => {
        el.dataset.revealed = 'true';
      });
    } else if (revealElements.length && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.dataset.revealed = 'true';
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      );

      revealElements.forEach((el) => observer.observe(el));
      cleanup.push(() => observer.disconnect());
    } else {
      revealElements.forEach((el) => {
        el.dataset.revealed = 'true';
      });
    }

    const nav = root.querySelector('header.nav');
    if (nav) {
      const showTop = 100;
      const delta = 6;
      let lastY = window.scrollY || 0;

      const onScroll = () => {
        const y = window.scrollY || 0;
        const distance = y - lastY;
        if (y <= showTop) nav.classList.remove('is-hidden');
        else if (distance > delta) nav.classList.add('is-hidden');
        else if (distance < -delta) nav.classList.remove('is-hidden');
        lastY = y;
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      cleanup.push(() => window.removeEventListener('scroll', onScroll));
    }

    const tabs = Array.from(root.querySelectorAll('[role="tab"][data-panel]'));
    const panels = Array.from(root.querySelectorAll('[data-panel-view]'));
    tabs.forEach((tab) => {
      const onClick = () => {
        const key = tab.getAttribute('data-panel');
        tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
        panels.forEach((panel) => {
          panel.classList.toggle('active', panel.getAttribute('data-panel-view') === key);
        });
      };

      tab.addEventListener('click', onClick);
      cleanup.push(() => tab.removeEventListener('click', onClick));
    });

    const toggles = Array.from(root.querySelectorAll('.toggle'));
    toggles.forEach((toggle) => {
      const onClick = () => {
        const next = toggle.getAttribute('aria-pressed') !== 'true';
        toggle.setAttribute('aria-pressed', String(next));
      };

      toggle.addEventListener('click', onClick);
      cleanup.push(() => toggle.removeEventListener('click', onClick));
    });

    const review = root.querySelector('#review-action');
    if (review) {
      const onClick = () => {
        review.textContent = 'Reviewed';
        review.disabled = true;
        review.style.background = 'var(--finance-dark)';
        review.style.borderColor = 'var(--finance-dark)';
      };

      review.addEventListener('click', onClick);
      cleanup.push(() => review.removeEventListener('click', onClick));
    }

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, []);

  return (
    <>
      <style data-open-finance-exact>{exactLanding.styles}</style>
      <div
        ref={rootRef}
        data-open-finance-exact-landing
        dangerouslySetInnerHTML={{ __html: exactLanding.body }}
      />
    </>
  );
}
