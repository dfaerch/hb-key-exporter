import LZString from 'lz-string'

export interface Order {
  created: string
  gamekey: string
  product: {
    category: 'storefront' | 'bundle' | 'gamepage' | 'widget' | 'subscriptioncontent'
    human_name: string
  }
  tpkd_dict: {
    all_tpks: Array<{
      machine_name: string
      expiry_date?: string
      human_name: string
      is_expired: boolean
      is_gift: boolean
      key_type: string
      keyindex: number
      redeemed_key_val?: string
      steam_app_id?: number
      sold_out?: boolean
      direct_redeem?: boolean
      exclusive_countries?: string[]
      disallowed_countries?: string[]
    }>
  }
}

export interface Product {
  machine_name: string
  category: 'Store' | 'Bundle' | 'Other' | 'Choice'
  category_id: string
  category_human_name: string
  human_name: string
  key_type: string
  type: 'Key' | 'Gift' | '-'
  redeemed_key_val: string
  is_gift: boolean
  is_expired: boolean
  owned: 'Yes' | 'No' | '-'
  expiry_date?: string
  steam_app_id?: number
  created: string
  keyindex?: number
}

const getCategory = (category: Order['product']['category']): Product['category'] => {
  switch (category) {
    case 'storefront':
      return 'Store'
    case 'bundle':
      return 'Bundle'
    case 'subscriptioncontent':
      return 'Choice'
    default:
      return 'Other'
  }
}

export const loadOrders = () =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith('v2|'))
    .map((key) => JSON.parse(LZString.decompressFromUTF16(localStorage.getItem(key))) as Order)
    .filter((order) => order?.tpkd_dict?.all_tpks?.length)

export const getProducts = (orders: Order[], ownedApps: number[]): Product[] =>
  orders.flatMap((order) =>
    order.tpkd_dict.all_tpks.map((product) => ({
      machine_name: product.machine_name || '-',
      category: getCategory(order.product.category),
      category_id: order.gamekey,
      category_human_name: order.product.human_name || '-',
      human_name: product.human_name || product.machine_name || '-',
      key_type: product.key_type || '-',
      type: product.is_gift ? 'Gift' : product.redeemed_key_val ? 'Key' : '-',
      redeemed_key_val: product.redeemed_key_val || '',
      is_gift: product.is_gift || false,
      is_expired: product.is_expired || false,
      expiry_date: product.expiry_date || '',
      steam_app_id: product.steam_app_id,
      created: order.created || '',
      keyindex: product.keyindex,
      owned: product.steam_app_id ? (ownedApps.includes(product.steam_app_id) ? 'Yes' : 'No') : '-',
    }))
  )

export const redeem = async (
  product: Pick<Product, 'machine_name' | 'category_id' | 'keyindex'>,
  gift: boolean = false
) => {
  console.log('Redeeming product:', product.machine_name)
  const data = await fetch('https://www.humblebundle.com/humbler/redeemkey', {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: `keytype=${product.machine_name}&key=${product.category_id}&keyindex=${product.keyindex}${gift ? '&gift=true' : ''}`,
    method: 'POST',
    mode: 'cors',
  }).then((res) => res.json())
  console.log('Redeem response:', data)

  // Add gift link
  if (data.success && gift) {
    data.gift_link = `https://www.humblebundle.com/gift?key=${data.giftkey}`
  }

  return data
}

const fetchOwnedApps = async (): Promise<Array<number>> =>
  new Promise<VMScriptResponseObject<{ rgOwnedPackages: number[]; rgOwnedApps: number[] }>>(
    (resolve) =>
      GM_xmlhttpRequest({
        url: 'https://store.steampowered.com/dynamicstore/userdata',
        method: 'GET',
        timeout: 5000,
        responseType: 'json',
        onload: resolve,
      })
  )
    .then((data) =>
      (data?.response?.rgOwnedPackages || []).concat(data?.response?.rgOwnedApps || [])
    )
    .catch(() => [])

let ownedApps: Array<number> = []
export const loadOwnedApps = async (refresh: boolean = false) => {
  if (!refresh && ownedApps.length) {
    console.debug('Using cached owned apps')
    return ownedApps
  }
  console.debug('Fetching owned apps from Steam')
  if (!refresh) {
    // Try to load from localStorage first
    const storedApps = localStorage.getItem('hb-key-exporter-ownedApps')
    if (storedApps) {
      console.debug('Using localStorage owned apps')
      return JSON.parse(LZString.decompressFromUTF16(storedApps)) as Array<number>
    }
  }

  // If not found, fetch from Steam
  ownedApps = await fetchOwnedApps()

  if (!ownedApps) {
    return []
  }
  // Store the result in localStorage for future use
  localStorage.setItem(
    'hb-key-exporter-ownedApps',
    LZString.compressToUTF16(JSON.stringify(ownedApps))
  )
  return ownedApps
}
