import { c, displayFont, headingFont } from "../utils/theme";

export function Pill({ children, tone = "primary" }) {
  const styles = {
    primary: { bg: c.primaryBg, fg: c.primaryDark },
    secondary: { bg: c.secondaryBg, fg: c.secondaryDark },
    accent: { bg: c.accentBg, fg: c.accentDark },
  };
  const { bg, fg } = styles[tone] || styles.primary;
  
  return (
    <span
      className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: bg, color: fg, ...displayFont }}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children }) {
  return (
    <div
      className="text-xs font-semibold uppercase tracking-wider mb-2"
      style={{ color: c.primary, ...displayFont }}
    >
      {children}
    </div>
  );
}

export function Card({ children, className = "", hover = false }) {
  return (
    <div
      className={`rounded-xl p-5 transition-all duration-200 ${hover ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer' : ''} ${className}`}
      style={{ 
        background: c.cardBg, 
        border: `1px solid ${c.lighterGray}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      {children}
    </div>
  );
}

export function Bar({ pct, color = c.primary }) {
  return (
    <div className="h-2 rounded-full overflow-hidden mt-3" style={{ background: c.lighterGray }}>
      <div 
        className="h-full rounded-full transition-all duration-300" 
        style={{ 
          width: `${pct}%`, 
          background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`
        }} 
      />
    </div>
  );
}

export function PrimaryButton({ children, className = "", variant = "primary", ...props }) {
  const variants = {
    primary: { bg: c.primary, hover: c.primaryDark, text: c.white },
    secondary: { bg: c.secondary, hover: c.secondaryDark, text: c.white },
    outline: { bg: 'transparent', hover: c.primaryBg, text: c.primary, border: c.primary },
  };
  
  const style = variants[variant] || variants.primary;
  
  return (
    <button
      className={`font-semibold text-sm px-5 py-2.5 rounded-lg transition-all duration-200 hover:shadow-md active:scale-95 ${className}`}
      style={{ 
        background: style.bg, 
        color: style.text,
        border: style.border ? `2px solid ${style.border}` : 'none',
        ...displayFont
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = style.hover}
      onMouseLeave={(e) => e.currentTarget.style.background = style.bg}
      {...props}
    >
      {children}
    </button>
  );
}
