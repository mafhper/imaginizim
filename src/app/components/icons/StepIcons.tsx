export function AnalyzeIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <rect x="10" y="10" width="12" height="12" rx="2" fill="currentColor" opacity="0.2" />
      <rect x="26" y="10" width="12" height="4" rx="1" fill="currentColor" opacity="0.15" />
      <rect x="26" y="18" width="8" height="4" rx="1" fill="currentColor" opacity="0.15" />
      <rect x="10" y="26" width="28" height="3" rx="1" fill="currentColor" opacity="0.12" />
      <rect x="10" y="33" width="20" height="3" rx="1" fill="currentColor" opacity="0.12" />
      <circle cx="36" cy="36" r="8" fill="hsl(var(--primary))" opacity="0.15" />
      <circle cx="36" cy="36" r="5" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <line
        x1="39.5"
        y1="39.5"
        x2="43"
        y2="43"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OptimizeIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 24C8 15.163 15.163 8 24 8"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.2"
        strokeLinecap="round"
      />
      <path
        d="M24 8C32.837 8 40 15.163 40 24"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M40 24C40 32.837 32.837 40 24 40"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        opacity="0.6"
        strokeLinecap="round"
      />
      <path
        d="M24 40C15.163 40 8 32.837 8 24"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="6" fill="hsl(var(--primary))" opacity="0.2" />
      <circle cx="24" cy="24" r="3" fill="hsl(var(--primary))" />
      <path d="M24 14V18" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M24 30V34"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        strokeLinecap="round"
      />
      <path
        d="M14 24H18"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
        strokeLinecap="round"
      />
      <path d="M30 24H34" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ExportIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="8"
        y="6"
        width="20"
        height="26"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <rect x="12" y="10" width="12" height="8" rx="1" fill="currentColor" opacity="0.12" />
      <rect x="12" y="21" width="12" height="2" rx="1" fill="currentColor" opacity="0.1" />
      <rect x="12" y="25" width="8" height="2" rx="1" fill="currentColor" opacity="0.1" />
      <rect
        x="20"
        y="16"
        width="20"
        height="26"
        rx="2"
        fill="hsl(var(--primary))"
        opacity="0.1"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      <path d="M30 30V26" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M27 28L30 25L33 28"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M26 35H34" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 6L40 14V24C40 33.941 33.209 42.669 24 44C14.791 42.669 8 33.941 8 24V14L24 6Z"
        fill="hsl(var(--primary))"
        opacity="0.1"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      <path
        d="M18 24L22 28L30 20"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FormatIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="4"
        y="8"
        width="16"
        height="14"
        rx="2"
        fill="hsl(var(--primary))"
        opacity="0.15"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
      />
      <text
        x="12"
        y="18"
        textAnchor="middle"
        fill="hsl(var(--primary))"
        fontSize="5"
        fontWeight="bold"
      >
        JPG
      </text>
      <rect
        x="24"
        y="4"
        width="16"
        height="14"
        rx="2"
        fill="hsl(var(--primary))"
        opacity="0.25"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
      />
      <text
        x="32"
        y="14"
        textAnchor="middle"
        fill="hsl(var(--primary))"
        fontSize="5"
        fontWeight="bold"
      >
        PNG
      </text>
      <rect
        x="8"
        y="26"
        width="16"
        height="14"
        rx="2"
        fill="hsl(var(--primary))"
        opacity="0.2"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
      />
      <text
        x="16"
        y="36"
        textAnchor="middle"
        fill="hsl(var(--primary))"
        fontSize="5"
        fontWeight="bold"
      >
        SVG
      </text>
      <rect
        x="28"
        y="22"
        width="16"
        height="14"
        rx="2"
        fill="hsl(var(--primary))"
        opacity="0.3"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
      />
      <text
        x="36"
        y="32"
        textAnchor="middle"
        fill="hsl(var(--primary))"
        fontSize="4.5"
        fontWeight="bold"
      >
        WebP
      </text>
      <path d="M20 15L24 11" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" />
      <path d="M20 33L28 29" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export function QuestionIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="hsl(var(--primary))"
        opacity="0.1"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      <path
        d="M18 18C18 14.686 20.686 12 24 12C27.314 12 30 14.686 30 18C30 20.21 28.752 22.126 26.913 23.088C25.723 23.71 25 24.937 25 26.27V28"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="25" cy="34" r="1.5" fill="hsl(var(--primary))" />
    </svg>
  );
}

export function CodeIcon({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="6"
        y="8"
        width="36"
        height="32"
        rx="4"
        fill="hsl(var(--primary))"
        opacity="0.08"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      <line
        x1="6"
        y1="16"
        x2="42"
        y2="16"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        opacity="0.3"
      />
      <circle cx="11" cy="12" r="1.5" fill="#FF6B6B" opacity="0.6" />
      <circle cx="16" cy="12" r="1.5" fill="#FFD93D" opacity="0.6" />
      <circle cx="21" cy="12" r="1.5" fill="#6BCB77" opacity="0.6" />
      <path
        d="M14 26L10 30L14 34"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 26L38 30L34 34"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M27 22L21 38" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
