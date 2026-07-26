import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingBanner } from './OnboardingBanner';

function renderBanner(isVisible = true): string {
  return renderToStaticMarkup(
    <OnboardingBanner
      isVisible={isVisible}
      onDismiss={vi.fn()}
      onStartCreating={vi.fn()}
    />,
  );
}

describe('OnboardingBanner', (): void => {
  it('renders the exact Phase 2 heading, body, and three steps', (): void => {
    const markup = renderBanner();

    expect(markup).toContain('Create your map');
    expect(markup).toContain(
      'Color countries, move the world to frame your view, and export a square PNG with a polished legend.',
    );
    expect(markup.match(/<li>/gu)).toHaveLength(3);
    expect(markup).toContain('<li>Select countries and apply colors.</li>');
    expect(markup).toContain(
      '<li>Move the map or choose a historical period.</li>',
    );
    expect(markup).toContain(
      '<li>Edit the legend, then export the exact view.</li>',
    );
  });

  it('uses the approved CTA and secondary labels', (): void => {
    const markup = renderBanner();

    expect(markup).toContain('>Start Creating</button>');
    expect(markup).toContain('>Dismiss Help</button>');
    expect(markup).not.toContain('Start Coloring');
  });

  it('stays a non-modal banner that Show Help can target', (): void => {
    const markup = renderBanner();

    expect(markup).toContain('<aside');
    expect(markup).toContain('id="onboarding-help"');
    expect(markup).toContain('aria-labelledby="onboarding-heading"');
    expect(markup).toContain('aria-describedby="onboarding-description"');
    expect(markup).not.toContain('role="dialog"');
    expect(markup).not.toContain('aria-modal');
  });

  it('advertises no deferred or unimplemented feature', (): void => {
    const markup = renderBanner();

    expect(markup).not.toMatch(/coming soon|batch|region|Ctrl|Cmd|⌘/iu);
  });

  it('renders nothing when help is hidden', (): void => {
    expect(renderBanner(false)).toBe('');
  });
});
