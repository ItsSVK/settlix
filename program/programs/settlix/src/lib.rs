use anchor_lang::prelude::*;

declare_id!("8Ke6bFDR9aYGvJyKEayQF6cEoMhZ5Wu2RKCUVydCW5oY");

#[program]
pub mod settlix {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
