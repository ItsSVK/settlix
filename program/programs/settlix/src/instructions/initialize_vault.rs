use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    RecipientInput, SettlixError, SplitRecipient, SplitVault, ANCHOR_DISCRIMINATOR, MAX_RECIPIENTS,
    VAULT_SEED,
};

#[derive(Accounts)]
#[instruction(vault_id: [u8; 32])]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR + SplitVault::INIT_SPACE,
        seeds = [VAULT_SEED, vault_id.as_ref()],
        bump
    )]
    pub vault: Account<'info, SplitVault>,

    /// The vault's SPL token account (ATA owned by the vault PDA).
    /// Buyers send USDC here directly — no other wallet involved.
    #[account(
        init,
        payer = authority,
        associated_token::mint = settlement_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub settlement_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeVault<'info> {
    pub fn initialize_vault(
        &mut self,
        vault_id: [u8; 32],
        recipients: Vec<RecipientInput>,
        bumps: &InitializeVaultBumps,
    ) -> Result<()> {
        require!(!recipients.is_empty(), SettlixError::NoRecipients);
        require!(
            recipients.len() <= MAX_RECIPIENTS,
            SettlixError::TooManyRecipients
        );

        let total_bps: u32 = recipients.iter().map(|r| r.basis_points as u32).sum();
        require!(total_bps == 10_000, SettlixError::BpsMustSumTo10000);

        let vault = &mut self.vault;
        vault.authority = self.authority.key();
        vault.vault_id = vault_id;
        vault.settlement_mint = self.settlement_mint.key();
        vault.bump = bumps.vault;
        vault.recipients = recipients
            .into_iter()
            .map(|r| SplitRecipient {
                wallet: r.wallet,
                basis_points: r.basis_points,
            })
            .collect();

        msg!("Vault initialized: {} recipients", vault.recipients.len());
        Ok(())
    }
}
