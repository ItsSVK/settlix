import type { Connection } from '@solana/web3.js'
import {
  AddressLookupTableAccount,
  MessageAddressTableLookup,
  TransactionMessage,
  VersionedMessage,
} from '@solana/web3.js'

/**
 * v0 messages reference Address Lookup Tables. `TransactionMessage.decompile` needs
 * resolved ALT accounts or it throws: "address table lookups were not resolved".
 */
export function getAddressTableLookupsFromMessage(message: VersionedMessage): MessageAddressTableLookup[] {
  return message.version === 0 ? message.addressTableLookups : []
}

export async function loadAddressLookupTableAccounts(
  connection: Connection,
  lookups: MessageAddressTableLookup[],
): Promise<AddressLookupTableAccount[]> {
  if (lookups.length === 0) return []

  const accounts: AddressLookupTableAccount[] = []
  for (const lookup of lookups) {
    const res = await connection.getAddressLookupTable(lookup.accountKey)
    if (!res.value) throw new Error(`Missing ALT ${lookup.accountKey.toBase58()}`)
    accounts.push(res.value)
  }
  return accounts
}

export async function decompileVersionedTransactionMessage(
  connection: Connection,
  message: VersionedMessage,
): Promise<TransactionMessage> {
  const alts = await loadAddressLookupTableAccounts(connection, getAddressTableLookupsFromMessage(message))
  return TransactionMessage.decompile(message, { addressLookupTableAccounts: alts })
}
