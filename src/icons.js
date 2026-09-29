const paths = {
 arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
 back: '<path d="m14 6-6 6 6 6"/>', next: '<path d="m10 6 6 6-6 6"/>',
 first: '<path d="M6 5v14m12-13-6 6 6 6"/>', last: '<path d="M18 5v14M6 6l6 6-6 6"/>',
 flip: '<path d="M5 7h14l-4-4M19 17H5l4 4M5 7v5m14 5v-5"/>',
 undo: '<path d="m9 4-5 5 5 5M4 9h9a6 6 0 0 1 0 12"/>',
 volume: '<path d="m11 5-6 4H2v6h3l6 4V5m4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute: '<path d="m11 5-6 4H2v6h3l6 4V5m5 4 5 6m0-6-5 6"/>',
 download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 flag: '<path d="M5 22V3c5-5 9 5 14 0v11c-5 5-9-5-14 0"/>',
 user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 close: '<path d="m6 6 12 12M6 18 18 6"/>',
 arrowRight: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
 chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
 check: '<path d="m5 12 4 4L19 6"/>',
};
export const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
export const bird = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M13 42 31 17l5 10 15 5-14 4-10 13 1-12Z" fill="currentColor"/><circle cx="35" cy="29" r="2" fill="#14232d"/></svg>`;
