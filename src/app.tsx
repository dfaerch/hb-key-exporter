import { createSignal, onMount, type Accessor, type Setter } from 'solid-js'
import DataTable, { type Api } from 'datatables.net-dt'
import { loadProducts, type Product } from './util'

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
                      fetch('https://www.humblebundle.com/humbler/redeemkey', {
                        credentials: 'include',
                        headers: {
                          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        },
                        body: `keytype=${row.machine_name}&key=${row.category_id}&keyindex=${row.keyindex}`,
                        method: 'POST',
                        mode: 'cors',
                      })
                        .then((res) => res.json())
                        .then((data) => navigator.clipboard.writeText(data.key))
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
                      fetch('https://www.humblebundle.com/humbler/redeemkey', {
                        credentials: 'include',
                        headers: {
                          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        },
                        body: `keytype=${row.machine_name}&key=${row.category_id}&keyindex=${row.keyindex}&gift=true`,
                        method: 'POST',
                        mode: 'cors',
                      })
                        .then((res) => res.json())
                        .then((data) =>
                          navigator.clipboard.writeText(
                            `https://www.humblebundle.com/gift?key=${data.giftkey}`
                          )
                        )
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
  const [exportType, setExportType] = createSignal('asf')
  const [filtered, setFiltered] = createSignal(false)

  const exportASF = (products: Product[] | Api<Product>) => {
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

  const exportKeys = (products: Product[] | Api<Product>) => {
    const keys = products
      .filter((product) => !product.is_gift && product.redeemed_key_val)
      .map((product) => product.redeemed_key_val)
      .join('\n')

    navigator.clipboard.writeText(keys)
  }

  const exportCSV = (products: Product[] | Api<Product>) => {
    const header = Object.keys(products[0])
    const csv = products
      .map((product) => {
        return header.map((h) => product[h]).join(',')
      })
      .join('\n')

    navigator.clipboard.writeText(header + '\n' + csv)
  }

  const exportToClipboard = () => {
    const toExport = filtered() ? dt.rows({ search: 'applied' }).data() : hbProducts

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
  }

  return (
    <div class={styles.actions}>
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
        onChange={(e) => setExportType(e.currentTarget.value)}
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
        disabled={!exportType()}
      >
        Export
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
