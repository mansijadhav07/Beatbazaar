interface VinylRecordProps {
  coverUrl?: string | null;
  fast?: boolean;
  className?: string;
}

const grooves = [94, 90, 86, 82, 78, 74, 70, 66, 62, 58, 54, 50];

export function VinylRecord({ coverUrl, fast = false, className = "" }: VinylRecordProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      className={`vinyl-record ${className}`}
      data-fast={fast}
    >
      <defs>
        <clipPath id="vinyl-label-clip">
          <circle cx="100" cy="100" r="40" />
        </clipPath>
      </defs>
      <g className="vinyl-rotor">
        <circle cx="100" cy="100" r="99" fill="#0a0810" stroke="#2a2140" strokeWidth="1" />
        {grooves.map((radius, index) => (
          <circle
            key={radius}
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={index % 3 === 0 ? "#241a38" : "#171123"}
            strokeWidth="1"
          />
        ))}
        <path d="M100 100 L100 1 A99 99 0 0 1 169 29 Z" fill="#B596FF" opacity="0.1" />
        <path d="M100 100 L100 199 A99 99 0 0 1 31 171 Z" fill="#B596FF" opacity="0.1" />
        <circle cx="100" cy="100" r="42" fill="#0a0810" />
        <image
          href={coverUrl || "/brand/disc-poster.svg"}
          x="60"
          y="60"
          width="80"
          height="80"
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#vinyl-label-clip)"
        />
        <circle cx="100" cy="100" r="40" fill="none" stroke="#0a0810" strokeWidth="2.5" />
        <circle cx="100" cy="100" r="4.5" fill="#09080D" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" />
      </g>
    </svg>
  );
}
