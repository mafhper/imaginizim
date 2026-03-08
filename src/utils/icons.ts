export type IconName =
  | 'spark'
  | 'sliders'
  | 'download'
  | 'refresh'
  | 'compare'
  | 'arrow-left'
  | 'arrow-right'
  | 'close'
  | 'menu';

const ICONS: Record<IconName, string> = {
  spark:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.5 11.7 7l4.8 1.7-4.8 1.7L10 15l-1.7-4.6L3.5 8.7 8.3 7 10 2.5Z"/><path d="m15.6 13.8.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z"/></svg>',
  sliders:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h12"/><path d="M4 10h12"/><path d="M4 14.5h12"/><circle cx="8" cy="5.5" r="1.7"/><circle cx="12.5" cy="10" r="1.7"/><circle cx="6.5" cy="14.5" r="1.7"/></svg>',
  download:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5v8.2"/><path d="m6.9 8.9 3.1 3.1 3.1-3.1"/><path d="M4 14.5h12"/></svg>',
  refresh:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.4 8A5.9 5.9 0 0 0 5.3 6.4"/><path d="M4.8 3.9v3.3h3.3"/><path d="M4.6 12A5.9 5.9 0 0 0 14.7 13.6"/><path d="M15.2 16.1v-3.3h-3.3"/></svg>',
  compare:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4" width="13" height="12" rx="2"/><path d="M10 4v12"/><path d="M13 8.2H14.8"/><path d="M5.2 11.8H7"/></svg>',
  'arrow-left':
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.8 4.8 7.6 10l5.2 5.2"/><path d="M7.9 10h8.1"/></svg>',
  'arrow-right':
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.2 4.8 12.4 10l-5.2 5.2"/><path d="M12.1 10H4"/></svg>',
  close:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5.3 5.3 9.4 9.4"/><path d="m14.7 5.3-9.4 9.4"/></svg>',
  menu: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h12"/><path d="M4 10h12"/><path d="M4 14.5h12"/></svg>'
};

export function renderIcon(name: IconName): string {
  return ICONS[name];
}

export function renderButtonContent(name: IconName, label: string): string {
  return [
    `<span class="btn-icon" aria-hidden="true">${renderIcon(name)}</span>`,
    `<span class="btn-label">${label}</span>`
  ].join('');
}
