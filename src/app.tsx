import { createSignal, onMount, type Accessor, type Setter } from 'solid-js'
import DataTable, { type Api } from 'datatables.net-dt'
import { loadProducts, redeem, type Product } from './util'

// @ts-expect-error missing types
import styles from './style.module.css'
import { showToast } from '@violentmonkey/ui'
import { hm } from '@violentmonkey/dom'
const hbProducts: Product[] = loadProducts()
let dt: Api<Product>
export function Table({ products }: { products: Accessor<Product[]> }) {
  let tableRef!: HTMLTableElement
  onMount(() => {
    dt = new DataTable<Product>(tableRef, {
      columnDefs: [
        {
          targets: [6, 7],
          render: DataTable.render.date(),
        },
        {
          targets: [8],
          data: null,
          defaultContent: '',
        },
      ],
      order: {
        idx: 6,
        dir: 'desc',
      },
      columns: [
        {
          title: 'Type',
          data: 'key_type',
          type: 'html-utf8',
          render: (data, type, row) =>
            hm(
              'i',
              {
                class: `hb hb-key hb-${data}`,
                onclick: () => showToast(JSON.stringify(row, null, 2)),
              },
              hm('span', { class: 'hidden', innerText: data })
            ),
          className: styles.platform,
        },
        {
          title: 'Name',
          data: 'human_name',
          type: 'html-utf8',
          render: (data, _, row) =>
            row.steam_app_id
              ? hm('a', {
                  href: `https://store.steampowered.com/app/${row.steam_app_id}`,
                  target: '_blank',
                  innerText: data,
                })
              : data,
        },
        { title: 'Category', data: 'category', type: 'string-utf8' },
        {
          title: 'Bundle Name',
          data: 'category_human_name',
          type: 'html-utf8',
          render: (data, _, row) =>
            hm('a', {
              href: `https://www.humblebundle.com/download?key=${row.category_id}`,
              target: '_blank',
              innerText: data,
            }),
        },
        { title: 'Gift', data: 'type', type: 'string-utf8' },
        {
          title: 'Revealed',
          data: (row: Product) => (row.is_gift || row.redeemed_key_val ? 'Yes' : 'No'),
          type: 'string-utf8',
        },
        { title: 'Purchased', data: 'created', type: 'date' },
        { title: 'Exp. Date', data: 'expiry_date', type: 'date' },
        {
          title: '',
          orderable: false,
          searchable: false,
          data: (row: Product) => {
            const actions = []
            if (row.redeemed_key_val) {
              actions.push(
                hm(
                  'button',
                  {
                    class: styles.btn,
                    title: 'Copy to clipboard',
                    type: 'button',
                    onclick: () => {
                      navigator.clipboard.writeText(row.redeemed_key_val)
                      showToast('Copied to clipboard')
                    },
                  },
                  hm('i', { class: 'hb hb-key hb-clipboard' })
                )
              )
            }
            if (
              row.redeemed_key_val &&
              !row.is_gift &&
              !row.is_expired &&
              row.key_type === 'steam'
            ) {
              actions.push(
                hm(
                  'a',
                  {
                    class: styles.btn,
                    href: `https://store.steampowered.com/account/registerkey?key=${row.redeemed_key_val}`,
                    target: '_blank',
                  },
                  hm('i', { class: 'hb hb-shopping-cart-light', title: 'Redeem' })
                )
              )
            }

            if (row.redeemed_key_val && row.is_gift && !row.is_expired) {
              actions.push(
                hm(
                  'a',
                  {
                    class: styles.btn,
                    href: row.redeemed_key_val,
                    target: '_blank',
                  },
                  hm('i', { class: 'hb hb-shopping-cart-light', title: 'Redeem' })
                )
              )
            }

            if (!row.redeemed_key_val && !row.is_gift && !row.is_expired) {
              actions.push(
                hm(
                  'button',
                  {
                    class: styles.btn,
                    type: 'button',
                    onclick: () => {
                      redeem(row)
                        .then((data) => navigator.clipboard.writeText(data))
                        .then(() => showToast('Key copied to clipboard'))
                    },
                  },
                  hm('i', { class: 'hb hb-magic', title: 'Reveal' })
                ),
                hm(
                  'button',
                  {
                    class: styles.btn,
                    type: 'button',
                    onclick: () => {
                      redeem(row, true)
                        .then((link) => navigator.clipboard.writeText(link))
                        .then(() => showToast('Link copied to clipboard'))
                    },
                  },
                  hm('i', { class: 'hb hb-gift', title: 'Create gift link' })
                )
              )
            }

            return hm('div', { class: styles.row_actions }, actions)
          },
        },
      ],
      data: products(),
      layout: {
        top1: 'searchBuilder',
      },
      createdRow: function (row, data: Product) {
        if (data.is_expired) {
          row.classList.add(styles.expired)
        }
      },
    })
  })

  return <table ref={tableRef} id="hb_extractor-table" class="display compact"></table>
}

function Actions() {
  const [exportType, setExportType] = createSignal('')
  const [filtered, setFiltered] = createSignal(false)
  const [claim, setClaim] = createSignal(false)
  const [claimType, setClaimType] = createSignal('key')
  const [exporting, setExporting] = createSignal(false)

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
        return header.map((h) => product[h]).join(',')
      })
      .join('\n')

    navigator.clipboard.writeText(header + '\n' + csv)
  }

  const exportToClipboard = async () => {
    setExporting(true)
    const toExport = filtered()
      ? (dt.rows({ search: 'applied' }).data().toArray() as Product[])
      : hbProducts

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
    }
    setExporting(false)
    showToast('Exported to clipboard')
  }

  return (
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
  )
}

function Refresh({ setProducs }: { setProducs: Setter<Product[]> }) {
  return (
    <button type="button" onClick={() => setProducs(loadProducts())} title="Reload products">
      <i class="hb hb-refresh"></i>
    </button>
  )
}

export function App() {
  const [products, setProducts] = createSignal(hbProducts)

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
      <Table products={products} />
      <Actions />
    </details>
  )
}
