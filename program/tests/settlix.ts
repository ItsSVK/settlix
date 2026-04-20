import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Settlix } from '../target/types/settlix'

describe('settlix', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.settlix as Program<Settlix>

  it('Is initialized!', async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc()
    console.log('Your transaction signature', tx)
  })
})
