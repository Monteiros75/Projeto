import { ChevronDown } from 'lucide-react'

export default function CollapsibleSection({
  title,
  subtitle,
  open,
  onToggle,
  badge,
  children,
  className = '',
}) {
  return (
    <section className={`rounded-xl border border-[#E5E7EB] bg-white ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-[#111827]">{title}</h3>
            {badge}
          </div>
          {subtitle ? <p className="mt-0.5 text-[13px] text-[#6B7280]">{subtitle}</p> : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[#6B7280] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="border-t border-[#E5E7EB] px-4 py-4">{children}</div> : null}
    </section>
  )
}
