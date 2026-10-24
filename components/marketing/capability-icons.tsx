import type { CSSProperties } from "react";

type IconProps = {
  className?: string;
  style?: CSSProperties;
};

/**
 * Chunky 3D capability icons in Tagly blue.
 * Light comes from the top-left: light top faces, brand-blue fronts,
 * deep-blue sides.
 */

export function ShoppingBag3D({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="bag-front" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FB923C" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <path
        d="M11.5 12.5C11.5 6.6 20.5 6.6 20.5 12.5"
        stroke="#C2410C"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M9.4 13.4H24.2L25.6 28.2H10.6Z" fill="#C2410C" />
      <path
        d="M7.6 12.2H22.4L23.6 26.9C23.7 27.5 23.2 28 22.6 28H8.6C8 28 7.5 27.5 7.6 26.9Z"
        fill="url(#bag-front)"
      />
      <path
        d="M11.3 12.2C11.3 6.8 19.7 6.8 19.7 12.2"
        stroke="#FDBA74"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M10 13.6H11.6L12.3 26.5H10.9C10.3 26.5 9.9 26 9.9 25.5Z"
        fill="#FDBA74"
        opacity=".55"
      />
      <rect x="15" y="16.6" width="5" height="4.2" rx="1" fill="#FFF7ED" />
      <path
        d="M16.2 18.2H18.8"
        stroke="#EA580C"
        strokeWidth=".8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Package3D({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="pkg-top" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#99F6E4" />
          <stop offset="1" stopColor="#5EEAD4" />
        </linearGradient>
        <linearGradient id="pkg-left" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id="pkg-right" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#0F766E" />
          <stop offset="1" stopColor="#115E59" />
        </linearGradient>
      </defs>
      <path d="M16 3 27 9 16 15 5 9Z" fill="url(#pkg-top)" />
      <path d="M5 9 16 15V29L5 23Z" fill="url(#pkg-left)" />
      <path d="M16 15 27 9V23L16 29Z" fill="url(#pkg-right)" />
      <path
        d="M11 11.9 14.4 13.8V27.5L11 25.6Z"
        fill="#F0FDFA"
        opacity=".9"
      />
      <path
        d="M14.4 6.1 17.6 7.9V12.4L14.4 10.6Z"
        fill="#F0FDFA"
        opacity=".75"
      />
      <path
        d="M5 9 16 15 27 9"
        stroke="#CCFBF1"
        strokeWidth=".7"
        opacity=".45"
      />
    </svg>
  );
}

export function Chat3D({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="chat-front" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#A78BFA" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path
        d="M6.8 10.4C6.8 8.3 8.5 6.6 10.6 6.6H25C27.1 6.6 28.8 8.3 28.8 10.4V19.4C28.8 21.5 27.1 23.2 25 23.2H15L9.2 27.8L10.4 23.2H10.6C8.5 23.2 6.8 21.5 6.8 19.4Z"
        fill="#4C1D95"
      />
      <path
        d="M5.5 9.2C5.5 7.1 7.2 5.4 9.3 5.4H23.7C25.8 5.4 27.5 7.1 27.5 9.2V18.2C27.5 20.3 25.8 22 23.7 22H13.7L7.9 26.6L9.1 22H9.3C7.2 22 5.5 20.3 5.5 18.2Z"
        fill="url(#chat-front)"
      />
      <ellipse cx="12" cy="9.4" rx="5.4" ry="2.5" fill="#DDD6FE" opacity=".5" />
      <circle cx="11.3" cy="14" r="1.35" fill="#F5F3FF" />
      <circle cx="16" cy="14" r="1.35" fill="#F5F3FF" />
      <circle cx="20.7" cy="14" r="1.35" fill="#F5F3FF" />
    </svg>
  );
}

export function Card3D({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="card-front" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FB7185" />
          <stop offset="1" stopColor="#F43F5E" />
        </linearGradient>
      </defs>
      <g transform="rotate(-8 16 16)">
        <rect
          x="5.6"
          y="10.8"
          width="21"
          height="12.6"
          rx="2.6"
          fill="#9F1239"
        />
        <rect
          x="5"
          y="9.4"
          width="21"
          height="12.6"
          rx="2.6"
          fill="url(#card-front)"
        />
        <rect x="5" y="12.6" width="21" height="2.4" fill="#FFE4E6" opacity=".85" />
        <rect x="8" y="16.8" width="4.2" height="3.2" rx=".8" fill="#FFE4E6" />
        <circle cx="22.4" cy="18.5" r="1" fill="#FECDD3" opacity=".75" />
        <circle cx="19.4" cy="18.5" r="1" fill="#FECDD3" opacity=".75" />
      </g>
    </svg>
  );
}

export function Growth3D({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="bar-top" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#86EFAC" />
          <stop offset="1" stopColor="#4ADE80" />
        </linearGradient>
        <linearGradient id="bar-front" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#22C55E" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>
        <linearGradient id="bar-side" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#15803D" />
          <stop offset="1" stopColor="#166534" />
        </linearGradient>
      </defs>
      <polygon points="6,23 8,21 13,21 11,23" fill="url(#bar-top)" />
      <rect x="6" y="23" width="5" height="6" fill="url(#bar-front)" />
      <polygon points="11,23 13,21 13,27 11,29" fill="url(#bar-side)" />

      <polygon points="13,18 15,16 20,16 18,18" fill="url(#bar-top)" />
      <rect x="13" y="18" width="5" height="11" fill="url(#bar-front)" />
      <polygon points="18,18 20,16 20,27 18,29" fill="url(#bar-side)" />

      <polygon points="20,13 22,11 27,11 25,13" fill="url(#bar-top)" />
      <rect x="20" y="13" width="5" height="16" fill="url(#bar-front)" />
      <polygon points="25,13 27,11 27,27 25,29" fill="url(#bar-side)" />
    </svg>
  );
}
