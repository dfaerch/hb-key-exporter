import { createResource, createSignal, Show } from 'solid-js'
import { getProducts, loadOrders, loadOwnedApps, type Product } from './util'

import { Table } from './components/Table'
import { Refresh } from './components/Refresh'
import { Actions } from './components/Actions'
import type { Api } from 'datatables.net-dt'

function addDuplicateCounts(products: Product[]): Product[] {
  const counts = new Map<string, { total: number; unrevealed: number }>()

  for (const p of products) {
    const name = p.human_name
    const stats = counts.get(name) || { total: 0, unrevealed: 0 }
    stats.total++
    if (!p.redeemed_key_val && !p.is_gift) {
      stats.unrevealed++
    }
    counts.set(name, stats)
  }

  return products.map((p) => ({
    ...p,
    _copies: counts.get(p.human_name)?.total || 0,
    _unrevealed: counts.get(p.human_name)?.unrevealed || 0,
  }))
}

export function App() {
  const [products, { refetch: refresh }] = createResource<Product[], boolean>(async (_, info) => {
    console.debug('Loading products...')
    const orders = loadOrders()
    const owned = await loadOwnedApps(info.refetching)

    console.debug('Loaded', orders.length, 'orders,', owned.length, 'owned apps')
    return addDuplicateCounts(getProducts(orders, owned))
  })

  const [dt, setDt] = createSignal<Api<Product> | null>(null)
  console.debug('App loaded')
  return (
    <details>
      <summary>
        <h3>
          <i class="hb hb-key"></i> Advanced Exporter
        </h3>
      </summary>
      <div style={{ display: 'flex', 'justify-content': 'end', 'align-items': 'center' }}>
        <Refresh refresh={refresh} />
      </div>
      <Show when={products()?.length} fallback={<p>Loading products...</p>}>
        <Table products={products()} setDt={setDt} />
      </Show>
      <Actions dt={dt} />
    </details>
  )
}
