export function Refresh({ refresh }: { refresh: () => void }) {
  return (
    <button type="button" onClick={() => refresh()} title="Reload products">
      <i class="hb hb-refresh"></i>
    </button>
  )
}
