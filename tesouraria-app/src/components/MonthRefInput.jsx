import { monthInputMax, monthInputMin } from '../lib/monthRef'

export default function MonthRefInput({
  value,
  onChange,
  min,
  max,
  dataReferencia,
  className = '',
  ...props
}) {
  return (
    <input
      type="month"
      value={value}
      min={min ?? monthInputMin(dataReferencia)}
      max={max ?? monthInputMax()}
      onChange={onChange}
      className={className}
      {...props}
    />
  )
}
