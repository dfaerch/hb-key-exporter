import { createSignal } from 'solid-js'
import { loadProducts, type Product } from './util'

import { Table } from './components/Table'
import { Refresh } from './components/Refresh'
import { Actions } from './components/Actions'
import type { Api } from 'datatables.net-dt'

export function App() {
  const [products, setProducts] = createSignal(loadProducts())
  const [dt, setDt] = createSignal<Api<Product> | null>(null)
  return (
    <details>
      <summary>
        <h3>
          <i class="hb hb-key"></i> Advanced Exporter
        </h3>
      </summary>
      <div style={{ display: 'flex', 'justify-content': 'end', 'align-items': 'center' }}>
        <Refresh setProducs={setProducts} />
      </div>
      <Table products={products} setDt={setDt} />
      <Actions dt={dt} />
    </details>
  )
}
