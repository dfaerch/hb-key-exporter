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
      redeemed_key_val?: string
      steam_app_id?: number
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
  type: 'Key' | 'Gift'
  redeemed_key_val: string
  is_gift: boolean
  is_expired: boolean
  expiry_date?: string
  steam_app_id?: number
  created: string
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

export const loadProducts = (): Product[] =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith('v2|'))
    .map((key) => JSON.parse(LZString.decompressFromUTF16(localStorage.getItem(key))) as Order)
    .filter((order) => order?.tpkd_dict?.all_tpks?.length)
    .flatMap((order) =>
      order.tpkd_dict.all_tpks.map((product) => ({
        machine_name: product.machine_name,
        category: getCategory(order.product.category),
        category_id: order.gamekey,
        category_human_name: order.product.human_name,
        human_name: product.human_name,
        key_type: product.key_type,
        type: product.is_gift ? 'Gift' : 'Key',
        redeemed_key_val: product.redeemed_key_val || '',
        is_gift: product.is_gift || false,
        is_expired: product.is_expired || false,
        expiry_date: product.expiry_date || '',
        steam_app_id: product.steam_app_id,
        created: order.created,
      }))
    )
