use anchor_lang::prelude::*;

use crate::MAX_RECIPIENTS;

#[account]
#[derive(InitSpace)]
pub struct SplitVault {
    /// Link creator — can update split config and close the vault.
    pub authority: Pubkey, // 32
    /// SHA-256 of the payment link ID — makes the PDA unique per link.
    pub vault_id: [u8; 32], // 32
    /// The SPL mint accepted by this vault (USDC).
    pub settlement_mint: Pubkey, // 32
    /// PDA bump.
    pub bump: u8, // 1
    /// Split recipients. Basis points must sum to 10000.
    #[max_len(MAX_RECIPIENTS)]
    pub recipients: Vec<SplitRecipient>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct SplitRecipient {
    pub wallet: Pubkey,    // 32
    pub basis_points: u16, // 2  — out of 10000
}

/// Used only as instruction input; never stored directly.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RecipientInput {
    pub wallet: Pubkey,
    pub basis_points: u16,
}
