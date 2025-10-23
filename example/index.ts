import { BuildinStateInterpreter, TableState } from '../src'
import { renderHtmlTable } from '../tests/utils'
import './index.css'

const submit = document.getElementById('submit') as HTMLButtonElement
const applyCommandBtn = document.getElementById(
  'apply-commands',
) as HTMLButtonElement
let tableState: TableState | null = null
let stateInterpreter: BuildinStateInterpreter | null = null

submit.addEventListener('click', (e) => {
  e.preventDefault()

  const rowInput = document.getElementById('row') as HTMLInputElement | null
  const colInput = document.getElementById('col') as HTMLInputElement | null

  if (!rowInput || !colInput) {
    console.warn('Row or column input not found (expected #row and #col)')
    return
  }

  const row = parseInt(rowInput.value, 10)
  const col = parseInt(colInput.value, 10)

  if (Number.isNaN(row) || Number.isNaN(col)) {
    alert('Please enter numeric row and column indices')
    return
  }

  createTable(row, col)
})

function createTable(rows: number, cols: number) {
  tableState = new TableState(rows, cols)
  stateInterpreter = new BuildinStateInterpreter(tableState)

  window.tableState = tableState
  window.stateInterpreter = stateInterpreter

  renderTable()
}

function renderTable() {
  const container = document.getElementById('table-container')
  const tableHtml = renderHtmlTable(tableState!.getGridData())

  container!.innerHTML = tableHtml
}

applyCommandBtn.addEventListener('click', () => {
  if (!tableState) {
    alert('Please create a table first')
    return
  }

  const commandInput = document.getElementById(
    'commands',
  ) as HTMLInputElement | null

  const commandStr = commandInput!.value.trim()

  if (!commandStr) {
    alert('Please enter a command')
    return
  }

  const commandJson = JSON.parse(commandStr)

  stateInterpreter!.applyCommands(commandJson)

  renderTable()
})

declare global {
  interface Window {
    tableState: TableState
    stateInterpreter: BuildinStateInterpreter
  }
}
