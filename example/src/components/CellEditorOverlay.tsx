import { useEffect, useRef } from 'react'

export default function CellEditorOverlay(props: {
  open: boolean
  value: string
  x: number
  y: number
  width: number
  height: number
  onChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}): JSX.Element | null {
  const ref = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (props.open) ref.current?.focus()
  }, [props.open])

  if (!props.open) return null

  const width = props.width + 2
  const height = props.height + 2
  const x = props.x - 1
  const y = props.y - 1

  return (
    <input
      ref={ref}
      role="textbox"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') props.onCommit()
        if (e.key === 'Escape') props.onCancel()
      }}
      className="absolute left-0 top-0 box-border border-2 border-indigo-500 outline-none bg-white shadow-lg rounded-sm transition-all animate-fade-in text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-200"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${x}px, ${y}px)`,
      }}
    />
  )
}
