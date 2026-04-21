use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::{RecipientInput, SettlixError, SplitRecipient, SplitVault, MAX_RECIPIENTS, VAULT_SEED};

#[derive(Accounts)]
pub struct UpdateRecipients<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [VAULT_SEED, vault.vault_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, SplitVault>,

    #[account(
        associated_token::mint = vault.settlement_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
}

impl<'info> UpdateRecipients<'info> {
    pub fn update_recipients(&mut self, recipients: Vec<RecipientInput>) -> Result<()> {
        require!(!recipients.is_empty(), SettlixError::NoRecipients);
        require!(
            recipients.len() <= MAX_RECIPIENTS,
            SettlixError::TooManyRecipients
        );

        let total_bps: u32 = recipients.iter().map(|r| r.basis_points as u32).sum();
        require!(total_bps == 10_000, SettlixError::BpsMustSumTo10000);

        require!(
            self.vault_token_account.amount == 0,
            SettlixError::VaultNotEmpty
        );

        let vault = &mut self.vault;
        vault.recipients = recipients
            .into_iter()
            .map(|r| SplitRecipient {
                wallet: r.wallet,
                basis_points: r.basis_points,
            })
            .collect();

        Ok(())
    }
}
