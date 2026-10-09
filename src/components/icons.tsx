import type { SVGProps } from "react";

/** Hand-drawn icon set for KasirKu — no icon library, so nothing is fetched at runtime. */
type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconKasir = (p: P) => (
  <Svg {...p}>
    <path d="M5 3.5h14v13.2l-2.3-1.4-2.4 1.5-2.3-1.5-2.4 1.5L5 16.7z" />
    <path d="M8.5 7.5h7M8.5 11h4.5" />
    <path d="M4 20.5h16" />
  </Svg>
);

export const IconBowl = (p: P) => (
  <Svg {...p}>
    <path d="M3 11h18a9 9 0 0 1-8.4 9h-1.2A9 9 0 0 1 3 11Z" />
    <path d="M8 8.2c0-1.6 1.3-2.2 1.3-3.7M12 7.8c0-1.9 1.5-2.4 1.5-4M16 8.4c0-1.3 1-1.9 1-3.1" />
    <path d="M2.5 20.5h19" />
  </Svg>
);

export const IconHistory = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 3-6.5" />
    <path d="M3 4v4.2h4.2" />
    <path d="M12 7.6V12l3.1 1.9" />
  </Svg>
);

export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 20.5h17" />
    <rect x="5" y="12" width="3.6" height="6" rx="1.2" />
    <rect x="10.2" y="7.5" width="3.6" height="10.5" rx="1.2" />
    <rect x="15.4" y="3.5" width="3.6" height="14.5" rx="1.2" />
  </Svg>
);

export const IconSettings = (p: P) => (
  <Svg {...p}>
    <path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h9M17 17.5h3" />
    <circle cx="15" cy="6.5" r="2.1" />
    <circle cx="9" cy="12" r="2.1" />
    <circle cx="15" cy="17.5" r="2.1" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMinus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 6.5h16M9 6.5V4h6v2.5M6.5 6.5 7.6 20h8.8l1.1-13.5" />
    <path d="M10.5 10v6M13.5 10v6" />
  </Svg>
);

export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="m14.5 5.5 4 4" />
  </Svg>
);

export const IconCloudOff = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 18.5h10a3.7 3.7 0 0 0 .8-7.3A5.6 5.6 0 0 0 8.6 8" />
    <path d="M5.2 10.4A4.6 4.6 0 0 0 6 18.4" />
    <path d="m3.5 3.5 17 17" />
  </Svg>
);

export const IconCloudCheck = (p: P) => (
  <Svg {...p}>
    <path d="M6.6 17.6h9.9a3.8 3.8 0 0 0 .6-7.5A5.7 5.7 0 0 0 6 8.6a4.5 4.5 0 0 0 .6 9Z" />
    <path d="m9.6 12.9 1.9 1.9 3.4-4" />
  </Svg>
);

export const IconSync = (p: P) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 0 1-13.6 5.7M4 12a8 8 0 0 1 13.6-5.7" />
    <path d="M4 19v-4.2h4.2M20 5v4.2h-4.2" />
  </Svg>
);

export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="m9 5.5 7 6.5-7 6.5" />
  </Svg>
);

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M19 12H5.5M11 5.5 4.8 12l6.2 6.5" />
  </Svg>
);

export const IconBackspace = (p: P) => (
  <Svg {...p}>
    <path d="M8.5 5.5h11a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-11L3 12z" />
    <path d="m12 9.5 5 5M17 9.5l-5 5" />
  </Svg>
);

export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M3 8.5h3.4L8 5.5h8l1.6 3H21v10H3z" />
    <circle cx="12" cy="13" r="3.4" />
  </Svg>
);

export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 15V3.5M8 7l4-3.6L16 7" />
    <path d="M5 13v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V13" />
  </Svg>
);

export const IconPrint = (p: P) => (
  <Svg {...p}>
    <path d="M7 8V3.5h10V8" />
    <path d="M4 8h16v7h-3v4.5H7V15H4z" />
    <path d="M9.5 15h5" />
  </Svg>
);

export const IconLogout = (p: P) => (
  <Svg {...p}>
    <path d="M15 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h9" />
    <path d="M17 8.5 20.5 12 17 15.5M10 12h10" />
  </Svg>
);

export const IconMail = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.4" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <path d="M12 14v2.6" />
  </Svg>
);

export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const IconGoogle = (p: P) => (
  <Svg {...p} strokeWidth={1.5}>
    <path d="M21 12.2c0-1-.1-1.7-.3-2.4H12v4.4h5.1a4.4 4.4 0 0 1-1.9 2.8v2.4h3A8.9 8.9 0 0 0 21 12.2Z" />
    <path d="M12 21.5a9 9 0 0 0 6.2-2.3l-3-2.4a5.8 5.8 0 0 1-8.6-3l-3.1 2.4A9 9 0 0 0 12 21.5Z" />
    <path d="M6.6 13.8a5.7 5.7 0 0 1 0-3.6L3.5 7.8a9 9 0 0 0 0 8.4l3.1-2.4Z" />
    <path d="M12 6.6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9 9 0 0 0 3.5 7.8l3.1 2.4A5.7 5.7 0 0 1 12 6.6Z" />
  </Svg>
);

export const IconChili = (p: P) => (
  <Svg {...p}>
    <path d="M14 4.5c2.8 0 5 2.4 5 6 0 4.6-3.6 8.6-8.4 9.4-3 .5-5.2-1-5.2-3.3 0-3 3.4-4.2 5.6-6.4" />
    <path d="M14 4.5c0-1.4-1.2-2-2.6-1.8" />
  </Svg>
);

export const IconBoba = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 7h11l-1.3 12.2a1.6 1.6 0 0 1-1.6 1.4H9.4a1.6 1.6 0 0 1-1.6-1.4z" />
    <path d="M5.5 7h13" />
    <path d="M14.5 3.5 12.8 7" />
    <circle cx="10" cy="17" r="1.3" />
    <circle cx="13.8" cy="18" r="1.3" />
  </Svg>
);

export const IconFire = (p: P) => (
  <Svg {...p}>
    <path d="M12 3s5.2 3.8 5.2 9a5.2 5.2 0 0 1-10.4 0c0-2 1-3.4 1-3.4s.6 1.6 1.8 1.6C11.2 10.2 9.4 6.8 12 3Z" />
  </Svg>
);

export const IconRice = (p: P) => (
  <Svg {...p}>
    <path d="M4 11h16a8 8 0 0 1-16 0Z" />
    <path d="M2.5 20h19" />
    <path d="M9 8.2c.6-1.4-.4-2.4.3-3.7M13.2 8c.6-1.5-.5-2.5.2-3.8" />
  </Svg>
);

export const IconSkewer = (p: P) => (
  <Svg {...p}>
    <path d="M3.5 20.5 20 4" />
    <circle cx="8" cy="16" r="2.2" />
    <circle cx="12" cy="12" r="2.2" />
    <circle cx="16" cy="8" r="2.2" />
  </Svg>
);

export const IconTag = (p: P) => (
  <Svg {...p}>
    <path d="M11 3.5H20.5V13L12 21.5 3 12.5z" />
    <circle cx="16.5" cy="7.5" r="1.6" />
  </Svg>
);

export const IconCoins = (p: P) => (
  <Svg {...p}>
    <ellipse cx="9.5" cy="7" rx="6.5" ry="2.8" />
    <path d="M3 7v4.5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8V7" />
    <path d="M14.5 12.6c3.3.4 6 1.6 6 3 0 1.6-2.9 2.9-6.5 2.9-3 0-5.5-.9-6.3-2.1" />
  </Svg>
);

export const IconBolt = (p: P) => (
  <Svg {...p}>
    <path d="M13.5 2.5 5 13.5h5.5L10 21.5 19 10h-5.6z" />
  </Svg>
);

export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5v11M8 11l4 4 4-4" />
    <path d="M4.5 17v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V17" />
  </Svg>
);

export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3.1" />
  </Svg>
);

export const IconEyeOff = (p: P) => (
  <Svg {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.6 6.3A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.6 3.4M6.2 8.2A15.6 15.6 0 0 0 2.5 12S6 18 12 18a9 9 0 0 0 3.3-.6" />
    <path d="M10.2 10.3a3 3 0 0 0 4.1 4.2" />
  </Svg>
);

export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
  </Svg>
);

export const IconNote = (p: P) => (
  <Svg {...p}>
    <path d="M5 3.5h14v17H5z" />
    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
  </Svg>
);

export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 2.8 4.5 6v6c0 4.4 3.2 7.6 7.5 9.2 4.3-1.6 7.5-4.8 7.5-9.2V6z" />
    <path d="m8.8 12 2.3 2.3 4.1-4.6" />
  </Svg>
);
