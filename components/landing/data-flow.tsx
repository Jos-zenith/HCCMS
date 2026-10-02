// Animated system diagram: devices -> API -> database -> engine -> dashboard

const NODES = [
  { x: 70, y: 60, label: "Tree module", sub: "soil · pH · light" },
  { x: 70, y: 150, label: "Leaf camera", sub: "canopy JPEG" },
  { x: 70, y: 240, label: "Air module", sub: "PM2.5 · CO₂" },
  { x: 330, y: 150, label: "REST API", sub: "keys · validation" },
  { x: 540, y: 90, label: "PostgreSQL", sub: "history" },
  { x: 540, y: 210, label: "Bark AI", sub: "ResNet50" },
  { x: 750, y: 150, label: "Carbon engine", sub: "Chave · IPCC · score" },
  { x: 940, y: 150, label: "Your dashboard", sub: "live · 10 s" },
]

const PATHS = [
  { d: "M140 60 C230 60 230 150 260 150", dur: 2.4, color: "hsl(152 64% 50%)" },
  { d: "M140 150 L260 150", dur: 2.0, color: "hsl(175 70% 55%)" },
  { d: "M140 240 C230 240 230 150 260 150", dur: 2.8, color: "hsl(42 92% 60%)" },
  { d: "M400 150 C450 150 450 90 470 90", dur: 1.8, color: "hsl(152 64% 50%)" },
  { d: "M400 150 C450 150 450 210 470 210", dur: 2.2, color: "hsl(175 70% 55%)" },
  { d: "M610 90 C650 90 650 150 680 150", dur: 1.9, color: "hsl(152 64% 50%)" },
  { d: "M610 210 C650 210 650 150 680 150", dur: 2.3, color: "hsl(175 70% 55%)" },
  { d: "M820 150 L870 150", dur: 1.4, color: "hsl(42 92% 60%)" },
]

export function DataFlow() {
  return (
    <div className="panel overflow-x-auto p-4 md:p-6">
      <svg viewBox="0 0 1010 300" className="min-w-[760px]" role="img" aria-label="Data flows from the ESP32 modules over HTTPS to the REST API, into PostgreSQL and the bark AI, through the carbon engine, to your dashboard.">
        {PATHS.map((p, i) => (
          <g key={i}>
            <path d={p.d} fill="none" stroke="hsl(150 14% 22%)" strokeWidth="2" />
            <path d={p.d} fill="none" stroke={p.color} strokeWidth="2" strokeDasharray="4 10" className="flow-dash" opacity="0.6" />
            {[0, 0.5].map((offset) => (
              <circle key={offset} r="4" cx="-20" cy="-20" fill={p.color} className="motion-reduce:hidden">
                <animateMotion dur={`${p.dur}s`} begin={`-${offset * p.dur}s`} repeatCount="indefinite" path={p.d} />
              </circle>
            ))}
          </g>
        ))}
        <text x="200" y="128" fill="hsl(145 8% 52%)" fontSize="11" textAnchor="middle">HTTPS · Wi-Fi</text>
        {NODES.map((n) => (
          <g key={n.label} transform={`translate(${n.x - 70} ${n.y - 26})`}>
            <rect width="140" height="52" rx="12" fill="hsl(150 22% 8%)" stroke="hsl(150 14% 20%)" />
            <text x="70" y="22" fill="hsl(140 15% 94%)" fontSize="13" fontWeight="600" textAnchor="middle">{n.label}</text>
            <text x="70" y="39" fill="hsl(145 8% 58%)" fontSize="11" textAnchor="middle">{n.sub}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
