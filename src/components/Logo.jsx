// eslint-disable-next-line react/prop-types
function Logo({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* 1. The Base (Deep / Leaves structure) */}
      <path
        d="M 10 62 C 30 62 50 70 50 88 C 30 88 10 80 10 62 Z"
        fill="#238636"
      />
      <path
        d="M 90 62 C 70 62 50 70 50 88 C 70 88 90 80 90 62 Z"
        fill="#2ea043"
      />

      {/* 2. The Sun / Flame */}
      <path d="M 25 62 A 25 25 0 0 1 75 62 Z" fill="#f9ab00" />
      <path d="M 38 62 A 12 12 0 0 1 62 62 Z" fill="#ffc107" />

      {/* 3. The Tech Rays */}
      <g
        stroke="#58a6ff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M 54 15 L 46 30" />
        <path d="M 32 25 L 20 32 L 32 39" />
        <path d="M 68 25 L 80 32 L 68 39" />
      </g>

      {/* Data Nodes */}
      <circle cx="12" cy="48" r="4" fill="#58a6ff" />
      <circle cx="88" cy="48" r="4" fill="#58a6ff" />
    </svg>
  );
}
export default Logo;
