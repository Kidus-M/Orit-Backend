export function AndroidLogoIcon() {
  return (
    <svg
      className="device-logo"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14.5 17C15.3 11 19.2 7.5 24 7.5S32.7 11 33.5 17h-19Z"
        fill="currentColor"
      />
      <path d="m17 9-2.4-4M31 9l2.4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 19h22v17a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4V19Z" fill="currentColor" />
      <rect x="7" y="19" width="4" height="17" rx="2" fill="currentColor" />
      <rect x="37" y="19" width="4" height="17" rx="2" fill="currentColor" />
      <rect x="17" y="37" width="5" height="8" rx="2.5" fill="currentColor" />
      <rect x="26" y="37" width="5" height="8" rx="2.5" fill="currentColor" />
      <circle cx="20" cy="13" r="1.25" fill="var(--device-icon-cutout, white)" />
      <circle cx="28" cy="13" r="1.25" fill="var(--device-icon-cutout, white)" />
    </svg>
  );
}

export function AppleLogoIcon() {
  return (
    <svg
      className="device-logo"
      viewBox="0 0 384 512"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-77.5-19.7C63.3 141.2 4 183.5 4 269.5c0 25.4 4.7 51.7 14.1 78.5 12.6 36.7 58 126.7 105.4 125.2 24.8-.6 42.3-17.6 74.6-17.6 31.4 0 47.6 17.6 75.2 17.6 47.8-.7 88.9-82.5 100.9-119.3-64.1-30.2-55.5-80.1-55.5-85.2Zm-58.5-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3Z" />
    </svg>
  );
}
