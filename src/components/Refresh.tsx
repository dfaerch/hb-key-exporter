import type { Setter } from 'solid-js'
import { loadProducts, type Product } from '../util'

export function Refresh({ setProducs }: { setProducs: Setter<Product[]> }) {
  return (
    <button type="button" onClick={() => setProducs(loadProducts(true))} title="Reload products">
      <i class="hb hb-refresh"></i>
    </button>
  )
}
