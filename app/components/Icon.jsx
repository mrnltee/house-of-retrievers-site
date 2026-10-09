const paths = {
  arrow: <path d="M5 12h14M14 6l6 6-6 6" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5a5.5 5.5 0 0 0 1-8.9Z" />,
  paw: (
    <>
      <ellipse cx="12" cy="15.8" rx="5.2" ry="4.2" />
      <ellipse cx="5.8" cy="10" rx="2.2" ry="2.8" />
      <ellipse cx="10" cy="6.5" rx="2.2" ry="2.8" />
      <ellipse cx="14.8" cy="6.5" rx="2.2" ry="2.8" />
      <ellipse cx="18.5" cy="10.5" rx="2.2" ry="2.8" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  share: (
    <>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
};

export const Icon = ({ name, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths[name]}
  </svg>
);

export default Icon;
