use anchor_lang::prelude::*;

#[error_code]
pub enum SettlixError {
    #[msg("At least one recipient is required")]
    NoRecipients,
    #[msg("Maximum 10 recipients per vault")]
    TooManyRecipients,
    #[msg("Recipient basis points must sum to exactly 10000")]
    BpsMustSumTo10000,
    #[msg("Vault token account balance is zero — nothing to distribute")]
    InsufficientBalance,
    #[msg("Number of remaining accounts must equal number of vault recipients")]
    RecipientAccountMismatch,
    #[msg("Vault token account must be empty — call distribute first")]
    VaultNotEmpty,
}
