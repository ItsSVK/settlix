use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

use crate::{SettlixError, SplitVault, VAULT_SEED};

#[derive(Accounts)]
pub struct Distribute<'info> {
    /// No signer required — fully permissionless.
    pub vault: Account<'info, SplitVault>,

    #[account(
        mut,
        associated_token::mint = vault.settlement_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    // remaining_accounts: one writable token account per recipient, in vault.recipients order.
}

impl<'info> Distribute<'info> {
    pub fn distribute(&mut self, remaining_accounts: &[AccountInfo<'info>]) -> Result<()> {
        let balance = self.vault_token_account.amount;
        require!(balance > 0, SettlixError::InsufficientBalance);

        let recipients = self.vault.recipients.clone();
        let num_recipients = recipients.len();

        require!(
            remaining_accounts.len() == num_recipients,
            SettlixError::RecipientAccountMismatch
        );

        let vault_id = self.vault.vault_id;
        let bump = self.vault.bump;
        let seeds: &[&[u8]] = &[VAULT_SEED, vault_id.as_ref(), &[bump]];
        let signer_seeds = &[seeds];

        let mut distributed: u64 = 0;

        for (i, recipient) in recipients.iter().enumerate() {
            // Last recipient absorbs any rounding dust so the vault is fully drained.
            let amount = if i == num_recipients - 1 {
                balance.saturating_sub(distributed)
            } else {
                (balance as u128)
                    .checked_mul(recipient.basis_points as u128)
                    .and_then(|v| v.checked_div(10_000))
                    .unwrap_or(0) as u64
            };

            if amount == 0 {
                continue;
            }

            let cpi_accounts = Transfer {
                from: self.vault_token_account.to_account_info(),
                to: remaining_accounts[i].clone(),
                authority: self.vault.to_account_info(),
            };

            let cpi_program = self.token_program.to_account_info();

            transfer(
                CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
                amount,
            )?;

            msg!("Distributed {} to {}", amount, recipient.wallet);
            distributed = distributed.saturating_add(amount);
        }

        Ok(())
    }
}
