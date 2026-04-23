use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::SettlixError;
pub use instructions::*;
pub use state::*;

declare_id!("DNEKZnPsm6T8thqtM9ZFrsLZr7tMGcVzc9fMrXNFcreh");

pub const MAX_RECIPIENTS: usize = 10;
pub const ANCHOR_DISCRIMINATOR: usize = 8;
pub const VAULT_SEED: &[u8] = b"split_vault";

// ─── Instructions ─────────────────────────────────────────────────────────────

#[program]
pub mod settlix {
    use super::*;

    /// Creates a PDA vault and its USDC token account.
    /// The vault_id (32-byte hash of the payment link ID) makes the PDA unique per link.
    /// Recipients receive basis_points out of 10000 (e.g. 7000 = 70%).
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        vault_id: [u8; 32],
        recipients: Vec<RecipientInput>,
    ) -> Result<()> {
        ctx.accounts
            .initialize_vault(vault_id, recipients, &ctx.bumps)
    }

    /// Permissionless — anyone can call this (your backend crank, or anyone else).
    /// Reads the stored split config and proportionally transfers the full vault
    /// balance to each recipient's token account.
    /// Remaining accounts: recipient token accounts, in the same order as vault.recipients.
    pub fn distribute<'info>(ctx: Context<'_, '_, '_, 'info, Distribute<'info>>) -> Result<()> {
        ctx.accounts.distribute(ctx.remaining_accounts)
    }

    /// Only the vault authority (link creator) can update the split config.
    /// The vault must have zero balance — distribute first.
    pub fn update_recipients(
        ctx: Context<UpdateRecipients>,
        recipients: Vec<RecipientInput>,
    ) -> Result<()> {
        ctx.accounts.update_recipients(recipients)
    }

    /// Closes the vault and its token account, returning all rent to the authority.
    /// Requires zero balance — call distribute first.
    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        ctx.accounts.close_vault()
    }
}
