import { useState } from 'react'
import { Card } from './ui/card'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'

export default function TableConfig(props: {
  onCreate: (args: { rows: number; cols: number }) => void
}): JSX.Element {
  const [rows, setRows] = useState(10)
  const [cols, setCols] = useState(10)

  return (
    <Card className="animate-fade-in">
      <div className="p-6 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-base text-slate-900 mb-0.5">Create Table</h3>
          <p className="text-xs text-slate-500">Define grid dimensions</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rows" className="text-xs font-medium">Rows</Label>
            <Input
              id="rows"
              type="number"
              min={1}
              max={1000}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cols" className="text-xs font-medium">Columns</Label>
            <Input
              id="cols"
              type="number"
              min={1}
              max={1000}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="h-9"
            />
          </div>

          <Button
            onClick={() => props.onCreate({ rows, cols })}
            className="w-full"
            size="default"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Table
          </Button>
        </div>
      </div>
    </Card>
  )
}
