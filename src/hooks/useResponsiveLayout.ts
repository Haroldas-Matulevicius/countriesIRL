import { useEffect, useState } from 'react';

const DESKTOP_MEDIA_QUERY = '(min-width: 1200px)';

export type ResponsiveLayout = 'desktop' | 'compact';

function getLayout(mediaQueryList: MediaQueryList): ResponsiveLayout {
  return mediaQueryList.matches ? 'desktop' : 'compact';
}

export function useResponsiveLayout(): ResponsiveLayout {
  const [mediaQueryList] = useState<MediaQueryList>(() =>
    window.matchMedia(DESKTOP_MEDIA_QUERY),
  );
  const [layout, setLayout] = useState<ResponsiveLayout>(() =>
    getLayout(mediaQueryList),
  );

  useEffect((): (() => void) => {
    const handleChange = (event: MediaQueryListEvent): void => {
      setLayout(event.matches ? 'desktop' : 'compact');
    };

    mediaQueryList.addEventListener('change', handleChange);
    return (): void => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [mediaQueryList]);

  return layout;
}
