const paths={
 back:'<path d="m14 5-7 7 7 7M7 12h14"/>',
 play:'<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
 pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',
 rewind:'<path d="M7 7H3V3M3 7a9 9 0 1 1-1 8"/><text x="12" y="15.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="Arial,sans-serif" font-weight="600" font-size="8">10</text>',
 forward:'<path d="M17 7h4V3m0 4a9 9 0 1 0 1 8"/><text x="12" y="15.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="Arial,sans-serif" font-weight="600" font-size="8">10</text>',
 volume:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 muted:'<path d="m11 4-6 5H2v6h3l6 5ZM16 9l6 6m0-6-6 6"/>',
 episodes:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M7 3h10M5 5h14"/>',
 pip:'<rect x="2" y="4" width="20" height="16" rx="2"/><rect x="11" y="11" width="8" height="6" fill="currentColor"/>',
 servers:'<path d="M6 18h12a4 4 0 0 0 0-8 6 6 0 0 0-12-1 4.5 4.5 0 0 0 0 9Z"/>',
 captions:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M10 10a2.5 2.5 0 1 0 0 4m8-4a2.5 2.5 0 1 0 0 4"/>',
 settings:'<path d="m10 3-1 3-3 1-3 3 2 2-1 3 3 3 3-1 2 4 3-1 1-3 3-1 2-3-2-2 1-3-3-3-3 1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
 fullscreen:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 chevron:'<path d="m8 10 4 4 4-4"/>',check:'<path d="m5 12 4 4L19 6"/>'};
export const playerIcon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;
