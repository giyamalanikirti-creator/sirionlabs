'use client';

import { useEffect, useState } from 'react';

/** The Outlook and Word mocks need room. BUILD_SPEC §4F. */
export function NarrowNotice() {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 1200);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!narrow) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 300,
        background: '#1F2A2E',
        color: '#fff',
        fontSize: 12,
        padding: '8px 14px',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(31,42,46,0.2)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      Best viewed on a laptop (1280 px or wider)
    </div>
  );
}
