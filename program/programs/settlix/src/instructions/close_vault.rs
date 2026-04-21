use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Token, TokenAccount},
};

use crate::{SettlixError, SplitVault, VAULT_SEED};

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(
        mut,
        has_one = authority,
        close = authority,
        seeds = [VAULT_SEED, vault.vault_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, SplitVault>,

    #[account(
        mut,
        associated_token::mint = vault.settlement_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> CloseVault<'info> {
    pub fn close_vault(&mut self) -> Result<()> {
        require!(
            self.vault_token_account.amount == 0,
            SettlixError::VaultNotEmpty
        );

        let vault_id = self.vault.vault_id;
        let bump = self.vault.bump;
        let seeds: &[&[u8]] = &[VAULT_SEED, vault_id.as_ref(), &[bump]];
        let signer_seeds = &[seeds];

        // Close the vault's token account; rent goes to authority.
        token::close_account(CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.vault_token_account.to_account_info(),
                destination: self.authority.to_account_info(),
                authority: self.vault.to_account_info(),
            },
            signer_seeds,
        ))?;

        Ok(())
    }
}
