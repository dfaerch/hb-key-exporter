import { onMount, type Setter } from 'solid-js'
import { redeem, type Product } from '../util'
import DataTable, { type Api } from 'datatables.net-dt'
import { hm } from '@violentmonkey/dom'
// @ts-expect-error missing types
import styles from '../style.module.css'
import { showToast } from '@violentmonkey/ui'

export function Table({ products, setDt }: { products: Product[]; setDt: Setter<Api<Product>> }) {
  let tableRef!: HTMLTableElement
  onMount(() => {
    console.debug('Mounting table with', products.length, 'products')
    setDt(
      () =>
        new DataTable<Product>(tableRef, {
          columnDefs: [
            {
              targets: ['purchased:name', 'expiry:name'],
              render: DataTable.render.date(),
            },
            {
              targets: 'actions:name',
              data: null,
              defaultContent: '',
            },
          ],
          order: {
            name: 'purchased',
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
              name: 'revealed_summary',
              className: 'no-searchbuilder', // mark this column for exclusion
              data: null,
              searchable: false,
              render: (_d, _t, row: Product) => {
                const revealed = row.is_gift || row.redeemed_key_val ? 'Yes' : 'No'
                return `${revealed} (${row._copies - row._unrevealed} of ${row._copies})`
              },
            },
            {
              title: 'Revealed', // for SearchBuilder
              name: 'revealed_raw',
              data: (row: Product) => (row.is_gift || row.redeemed_key_val ? 'Yes' : 'No'),
              visible: false,
              searchable: true,
              type: 'string-utf8',
            },

            {
              title: 'Copies',
              data: '_copies',
              visible: false,
              searchable: true,
              type: 'num',
            },
            {
              title: 'Unrevealed',
              data: '_unrevealed',
              visible: false,
              searchable: true,
              type: 'num',
            },
            { title: 'Owned', data: 'owned', type: 'string-utf8' },
            { title: 'Purchased', name: 'purchased', data: 'created', type: 'date' },
            { title: 'Exp. Date', name: 'expiry', data: 'expiry_date', type: 'date' },
            {
              title: '',
              name: 'actions',
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
                        onclick: async () => {
                          try {
                            const data = await redeem(row)
                            if (!data.success) {
                              return showToast(data.error_msg || 'Redeem failed', {
                                type: 'error',
                                duration: 3200,
                              })
                            }
                            if (!data.link) {
                              if (data.giftkey) {
                                return showToast(
                                  'Items has already been gifted. Cannot redeem key.',
                                  { type: 'error', duration: 3200 }
                                )
                              }
                              return showToast('No key received', { type: 'error', duration: 3200 })
                            }

                            await navigator.clipboard.writeText(data.link)
                            showToast('Key copied to clipboard')
                          } catch {
                            showToast('Error retrieving key', { type: 'error', duration: 3200 })
                          }
                        },
                      },
                      hm('i', { class: 'hb hb-magic', title: 'Reveal' })
                    ),
                    hm(
                      'button',
                      {
                        class: styles.btn,
                        type: 'button',
                        onclick: async () => {
                          try {
                            const data = await redeem(row, true)
                            if (!data.success) {
                              return showToast(data.error_msg || 'Failed to create gift link', {
                                type: 'error',
                                duration: 5000,
                              })
                            }
                            if (!data.gift_link) {
                              return showToast('No gift link received', {
                                type: 'error',
                                duration: 5000,
                              })
                            }

                            await navigator.clipboard.writeText(data.gift_link)
                            showToast('Link copied to clipboard')
                          } catch {
                            showToast('Error creating gift link', { type: 'error', duration: 5000 })
                          }
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
          data: products,
          layout: {
            top1: 'searchBuilder',
          },
          searchBuilder: {
            columns: ':not(.no-searchbuilder)',
          },
          createdRow: function (row, data: Product) {
            if (data.is_expired) {
              row.classList.add(styles.expired)
            }
          },
        })
    )
  })
  console.debug('Table Loaded')
  return <table ref={tableRef} id="hb_extractor-table" class="display compact"></table>
}
