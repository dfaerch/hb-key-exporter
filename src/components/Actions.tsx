import { createSignal, type Accessor } from 'solid-js'
import { redeem, type Product } from '../util'
import { showToast } from '@violentmonkey/ui'
// @ts-expect-error missing types
import styles from '../style.module.css'
import type { Api } from 'datatables.net-dt'

export function Actions({ dt }: { dt: Accessor<Api<Product>> }) {
  const [exportType, setExportType] = createSignal('')
  const [filtered, setFiltered] = createSignal(false)
  const [claim, setClaim] = createSignal(false)
  const [claimType, setClaimType] = createSignal('key')
  const [exporting, setExporting] = createSignal(false)
  const [separator, setSeparator] = createSignal(',')

  const exportASF = (products: Product[]) => {
    const keys = products
      .filter(
        (product) =>
          !product.is_gift &&
          product.redeemed_key_val &&
          !product.is_expired &&
          product.key_type === 'steam'
      )
      .map((product) => `${product.redeemed_key_val}\t${product.human_name}`)
      .join('\n')

    navigator.clipboard.writeText(keys)
  }

  const exportKeys = (products: Product[]) => {
    const keys = products
      .filter((product) => !product.is_gift && product.redeemed_key_val)
      .map((product) => product.redeemed_key_val)
      .join('\n')

    navigator.clipboard.writeText(keys)
  }

  const exportCSV = (products: Product[]) => {
    const header = Object.keys(products[0])
    const csv = products
      .map((product) => {
        return header.map((h) => product[h]).join(separator())
      })
      .join('\n')

    navigator.clipboard.writeText(header.join(separator()) + '\n' + csv)
  }

  const exportJSON = (products: Product[]) => {
    navigator.clipboard.writeText(JSON.stringify(products, null, 2))
  }

  const exportToClipboard = async () => {
    setExporting(true)
    const toExport = dt()
      .rows({ search: filtered() ? 'applied' : 'none' })
      .data()
      .toArray() as Product[]

    if (claim()) {
      for (const product of toExport) {
        if (product.redeemed_key_val) {
          continue
        }
        try {
          product.redeemed_key_val = await redeem(product, claimType() === 'gift')
        } catch (e) {
          console.error('Error redeeming product:', product.machine_name, e)
        }
      }
    }

    switch (exportType()) {
      case 'asf':
        exportASF(toExport)
        break
      case 'keys':
        exportKeys(toExport)
        break
      case 'csv':
        exportCSV(toExport)
        break
      case 'json':
        exportJSON(toExport)
        break
    }
    setExporting(false)
    showToast('Exported to clipboard')
  }

  return (
    <>
      <div class={styles.actions}>
        <label for="separator">
          CSV Separator&nbsp;
          <input
            type="text"
            name="separator"
            id="separator"
            value=","
            onInput={(e) => setSeparator(e.target.value)}
            style={{ width: '5ch', 'text-align': 'center' }}
            required
          />
        </label>
      </div>
      <div class={styles.actions}>
        <label for="claim">
          <input
            type="checkbox"
            id="claim"
            name="claim"
            onChange={(e) => setClaim(e.target.checked)}
          />
          Claim unredeemed games
        </label>
        <select
          name="claimType"
          id="claimType"
          class={styles.select}
          classList={{ hidden: !claim() }}
          onChange={(e) => setClaimType(e.target.value)}
        >
          <option value="" disabled>
            What to claim
          </option>
          <option value="key" selected>
            Key
          </option>
          <option value="gift">Gift link</option>
        </select>
        <label for="filtered">
          <input
            type="checkbox"
            id="filtered"
            name="filtered"
            onChange={(e) => setFiltered(e.target.checked)}
          />
          Use table filter
        </label>
        <select
          name="export"
          id="export"
          class={styles.select}
          onChange={(e) => setExportType(e.target.value)}
        >
          <option value="" disabled selected>
            Export format
          </option>
          <option value="asf">ASF</option>
          <option value="keys">Keys</option>
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
        <button
          type="button"
          class="primary-button"
          onClick={exportToClipboard}
          disabled={!exportType() || exporting()}
        >
          {exporting() ? <i class="hb hb-spin hb-spinner"></i> : 'Export'}
        </button>
      </div>
    </>
  )
}
