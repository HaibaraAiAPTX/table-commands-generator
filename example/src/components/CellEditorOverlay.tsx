import { useEffect, useRef } from 'react'
import { useZoom } from './CanvasViewport'

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
  const zoom = useZoom()
  const scale = zoom / 100

  useEffect(() => {
    if (props.open) ref.current?.focus()
  }, [props.open])

  if (!props.open) return null

  // The overlay is inside the scaled container, so we use unscaled coordinates
  // CSS transform will automatically scale the element
  // We only adjust border and font size to maintain visual consistency
  const inverseScale = 1 / scale
  const width = props.width - 2
  const height = props.height - 2

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
        transform: `translate(${props.x}px, ${props.y}px)`,
        // Scale border inversely so it maintains visual width
        borderWidth: `${Math.max(1, 2 / scale)}px`,
        // Scale font inversely so text remains readable
        fontSize: `${14 / scale}px`,
        // Scale padding inversely
        paddingLeft: `${8 / scale}px`,
        paddingRight: `${8 / scale}px`,
        paddingTop: `${6 / scale}px`,
        paddingBottom: `${6 / scale}px`,
      }}
    />
  )
}
