import bluejay from './bluejay.svg?raw';

const paths = {
  first: '<path d="m11 17-5-5 5-5m7 10-5-5 5-5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  last: '<path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>',
  flip: '<path d="M7 20V4M3 8l4-4 4 4m6-4v16m4-4-4 4-4-4"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  flag: '<path d="M5 21V4h12l-2.5 4.5L17 13H5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m22 9-6 6m0-6 6 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
  external: '<path d="M7 17 17 7M8 7h9v9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  retry: '<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16m0 5v-5h5"/>',
};
export const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ''}</svg>`;
// One blue jay drawing for the interface and generated favicon.
export const bird = bluejay.replace('<svg ', '<svg class="bird" aria-hidden="true" ');
