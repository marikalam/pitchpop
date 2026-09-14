const VARIANTS = {
  maddie: { badge: '#EDE1F9', hair: '#6B4226', pigtails: true, bow: true },
  marcus: { badge: '#DCEAFB', hair: '#3A2A1C', pigtails: false, bow: false },
  melody: { badge: '#FDE3EC', hair: '#8B5E3C', pigtails: true, bow: false },
};

export default function Avatar({ profile, size = 32 }) {
  const { badge, hair, pigtails, bow } = VARIANTS[profile] || VARIANTS.marcus;
  const skin = '#F3C9A0';

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="20" fill={badge} />
      {pigtails && (
        <>
          <circle cx="8.5" cy="23" r="4.2" fill={hair} />
          <circle cx="31.5" cy="23" r="4.2" fill={hair} />
        </>
      )}
      <path
        d={
          pigtails
            ? 'M 9 20 C 9 10.5 31 10.5 31 20 L 31 18.5 C 31 13 9 13 9 18.5 Z'
            : 'M 9 19 C 9 9.5 31 9.5 31 19 L 31 16.5 C 31 11 9 11 9 16.5 Z'
        }
        fill={hair}
      />
      <circle cx="20" cy="23" r="10.5" fill={skin} />
      {bow && <path d="M 25 9 L 28.5 7 L 27.3 10.3 L 30.5 10.3 L 27 12.5 Z" fill="#E86BA0" />}
      <circle cx="16.3" cy="22.5" r="1.4" fill="#3A2E2A" />
      <circle cx="23.7" cy="22.5" r="1.4" fill="#3A2E2A" />
      <circle cx="14.5" cy="26.5" r="1.9" fill="#F3A6B0" opacity="0.65" />
      <circle cx="25.5" cy="26.5" r="1.9" fill="#F3A6B0" opacity="0.65" />
      <path d="M 16.5 27.5 Q 20 30.3 23.5 27.5" fill="none" stroke="#3A2E2A" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
