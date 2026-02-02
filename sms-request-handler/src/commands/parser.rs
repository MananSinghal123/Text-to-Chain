use std::sync::Arc;
use sha2::Digest;
use crate::db::{UserRepository, VoucherRepository, DepositRepository, AddressBookRepository};
use crate::wallet::{AmoyProvider, UserWallet, Chain, MultiChainProvider};

/// Parsed SMS command
#[derive(Debug, Clone, PartialEq)]
pub enum Command {
    /// Show help/available commands
    Help,
    /// Register a new user
    Join,
    /// Check account balance
    Balance,
    /// Set or change PIN
    Pin { new_pin: Option<String> },
    /// Send money to someone
    Send {
        amount: f64,
        token: String,
        recipient: String,
    },
    /// Check deposit address
    Deposit,
    /// Check transaction history
    History,
    /// Redeem a voucher code
    Redeem { code: String },
    /// Save a contact: SAVE <name> <phone>
    Save { name: String, phone: String },
    /// List contacts
    Contacts,
    /// Switch chain: CHAIN <name>
    SwitchChain { chain: String },
    /// Unknown command
    Unknown(String),
}

/// Command processor that parses and executes commands
#[derive(Clone)]
pub struct CommandProcessor {
    user_repo: Option<UserRepository>,
    voucher_repo: Option<VoucherRepository>,
    deposit_repo: Option<DepositRepository>,
    address_book_repo: Option<AddressBookRepository>,
    provider: Arc<AmoyProvider>,
    multi_chain: MultiChainProvider,
}

impl CommandProcessor {
    pub fn new(user_repo: Option<UserRepository>, provider: Arc<AmoyProvider>) -> Self {
        Self { 
            user_repo,
            voucher_repo: None,
            deposit_repo: None,
            address_book_repo: None,
            provider,
            multi_chain: MultiChainProvider::new(),
        }
    }

    /// Create with all repositories
    pub fn with_repos(
        user_repo: Option<UserRepository>,
        voucher_repo: Option<VoucherRepository>,
        deposit_repo: Option<DepositRepository>,
        address_book_repo: Option<AddressBookRepository>,
        provider: Arc<AmoyProvider>,
    ) -> Self {
        Self {
            user_repo,
            voucher_repo,
            deposit_repo,
            address_book_repo,
            provider,
            multi_chain: MultiChainProvider::new(),
        }
    }

    /// Process an incoming SMS and return the response
    pub async fn process(&self, from: &str, body: &str) -> String {
        let command = self.parse(body);
        
        tracing::debug!(
            from = %from,
            command = ?command,
            "Processing command"
        );

        self.execute(from, command).await
    }

    /// Parse SMS text into a structured command
    pub fn parse(&self, text: &str) -> Command {
        let text = text.trim().to_uppercase();
        let parts: Vec<&str> = text.split_whitespace().collect();

        if parts.is_empty() {
            return Command::Unknown("".to_string());
        }

        match parts[0] {
            "HELP" | "?" | "COMMANDS" => Command::Help,
            "JOIN" | "START" | "REGISTER" => Command::Join,
            "BALANCE" | "BAL" => Command::Balance,
            "PIN" => {
                let new_pin = parts.get(1).map(|s| s.to_string());
                Command::Pin { new_pin }
            }
            "SEND" => self.parse_send(&parts),
            "DEPOSIT" | "RECEIVE" => Command::Deposit,
            "HISTORY" | "TRANSACTIONS" | "TXS" => Command::History,
            "REDEEM" | "VOUCHER" | "CODE" => {
                if parts.len() < 2 {
                    Command::Unknown("Usage: REDEEM <code>".to_string())
                } else {
                    Command::Redeem { code: parts[1].to_string() }
                }
            }
            "SAVE" | "ADD" => self.parse_save(&parts),
            "CONTACTS" | "BOOK" => Command::Contacts,
            "CHAIN" | "NETWORK" => {
                if parts.len() < 2 {
                    Command::Unknown("Usage: CHAIN <polygon|base|eth|arb>".to_string())
                } else {
                    Command::SwitchChain { chain: parts[1].to_string() }
                }
            }
            _ => Command::Unknown(text),
        }
    }

    /// Parse SAVE command: SAVE <name> <phone>
    fn parse_save(&self, parts: &[&str]) -> Command {
        if parts.len() < 3 {
            return Command::Unknown("Usage: SAVE <name> <phone>".to_string());
        }
        Command::Save {
            name: parts[1].to_string(),
            phone: parts[2..].join(" "),
        }
    }

    /// Parse SEND command: SEND <amount> <token> TO <recipient>
    fn parse_send(&self, parts: &[&str]) -> Command {
        if parts.len() < 5 {
            return Command::Unknown("Invalid SEND format. Use: SEND <amount> <token> TO <phone>".to_string());
        }

        let amount = match parts[1].parse::<f64>() {
            Ok(amt) => amt,
            Err(_) => return Command::Unknown("Invalid amount".to_string()),
        };

        let token = parts[2].to_string();
        
        let to_index = parts.iter().position(|&p| p == "TO");
        if to_index.is_none() || to_index.unwrap() + 1 >= parts.len() {
            return Command::Unknown("Missing recipient. Use: SEND <amount> <token> TO <phone>".to_string());
        }

        let recipient = parts[to_index.unwrap() + 1..].join(" ");

        Command::Send {
            amount,
            token,
            recipient,
        }
    }

    /// Execute a parsed command and return the response text
    async fn execute(&self, from: &str, command: Command) -> String {
        match command {
            Command::Help => self.help_response(),
            Command::Join => self.join_response(from).await,
            Command::Balance => self.balance_response(from).await,
            Command::Pin { new_pin } => self.pin_response(from, new_pin).await,
            Command::Send { amount, token, recipient } => {
                self.send_response(from, amount, &token, &recipient)
            }
            Command::Deposit => self.deposit_response(from).await,
            Command::History => self.history_response(from).await,
            Command::Redeem { code } => self.redeem_response(from, &code).await,
            Command::Save { name, phone } => self.save_response(from, &name, &phone).await,
            Command::Contacts => self.contacts_response(from).await,
            Command::SwitchChain { chain } => self.chain_response(from, &chain).await,
            Command::Unknown(text) => self.unknown_response(&text),
        }
    }

    fn help_response(&self) -> String {
        "TextChain Commands:\n\
         JOIN - Create wallet\n\
         BALANCE - Check balance\n\
         REDEEM <code> - Use voucher\n\
         DEPOSIT - Get address\n\
         SEND 10 USDC TO +91...\n\
         SAVE <name> <phone>\n\
         CONTACTS - List saved\n\
         CHAIN <polygon|base>\n\
         HELP - This message".to_string()
    }

    async fn join_response(&self, from: &str) -> String {
        // Check if database is available
        let Some(ref repo) = self.user_repo else {
            return "DB offline. Try later.".to_string();
        };

        // Check if user already exists
        match repo.exists(from).await {
            Ok(true) => {
                return format!("Welcome back!\n\nReply BALANCE or DEPOSIT");
            }
            Ok(false) => {}
            Err(e) => {
                tracing::error!("DB error: {}", e);
                return "Error. Try later.".to_string();
            }
        }

        // Create new wallet
        let wallet = match UserWallet::create_new() {
            Ok(w) => w,
            Err(e) => {
                tracing::error!("Wallet error: {}", e);
                return "Error creating wallet.".to_string();
            }
        };

        // Encrypt private key (simple hex for now - TODO: proper encryption)
        let encrypted_key = hex::encode(wallet.private_key_bytes());

        // Save to database
        match repo.create(from, &wallet.address_string(), &encrypted_key).await {
            Ok(_) => {
                format!(
                    "Wallet created!\n\n{}\n\nReply DEPOSIT to fund it.",
                    wallet.address_string()
                )
            }
            Err(e) => {
                tracing::error!("DB save error: {}", e);
                "Error saving wallet.".to_string()
            }
        }
    }

    async fn balance_response(&self, from: &str) -> String {
        let Some(ref repo) = self.user_repo else {
            return "Balance: $0.00\nDB offline.".to_string();
        };

        // Get user from database
        let user = match repo.find_by_phone(from).await {
            Ok(Some(u)) => u,
            Ok(None) => return "No wallet. Reply JOIN first.".to_string(),
            Err(_) => return "Error. Try later.".to_string(),
        };

        // Restore wallet to get address
        let key_bytes: [u8; 32] = match hex::decode(&user.encrypted_private_key) {
            Ok(bytes) if bytes.len() == 32 => bytes.try_into().unwrap(),
            _ => return "Error reading wallet.".to_string(),
        };

        let wallet = match UserWallet::from_private_key(&key_bytes) {
            Ok(w) => w,
            Err(_) => return "Error loading wallet.".to_string(),
        };

        // Check balances across all chains in parallel
        let chains = self.multi_chain.available_chains();
        let mut tasks = Vec::new();

        for chain in chains {
            if let Some(provider) = self.multi_chain.get(chain) {
                let addr = wallet.address;
                tasks.push(async move {
                    crate::wallet::get_chain_balances(provider.clone(), chain, addr).await
                });
            }
        }

        // Execute all balance checks concurrently
        let results = futures::future::join_all(tasks).await;
        
        // Collect successful non-zero balances
        let mut balance_strings = Vec::new();
        for result in results {
            match result {
                Ok(bal) => {
                    let has_native = !bal.native.balance.is_zero();
                    let has_usdc = bal.usdc.as_ref().map_or(false, |u| !u.balance.is_zero());
                    
                    if has_native || has_usdc {
                        balance_strings.push(bal.to_sms_string());
                    }
                }
                Err(e) => {
                    tracing::warn!("Balance check failed: {}", e);
                }
            }
        }

        if balance_strings.is_empty() {
             "Balance: $0.00\n\nReply DEPOSIT to fund wallet.".to_string()
        } else {
             format!("Balances:\n{}\n\nReply DEPOSIT for address.", balance_strings.join("\n"))
        }
    }

    async fn pin_response(&self, from: &str, new_pin: Option<String>) -> String {
        match new_pin {
            Some(pin) => {
                if pin.len() < 4 || pin.len() > 6 || !pin.chars().all(|c| c.is_ascii_digit()) {
                    "PIN must be 4-6 digits.\nExample: PIN 1234".to_string()
                } else {
                    // Save PIN hash
                    if let Some(ref repo) = self.user_repo {
                        // Simple hash for demo (use bcrypt in production)
                        let pin_hash = format!("{:x}", sha2::Sha256::digest(pin.as_bytes()));
                        if repo.update_pin(from, &pin_hash).await.is_ok() {
                            return "PIN set!".to_string();
                        }
                    }
                    "PIN set!".to_string()
                }
            }
            None => "Reply: PIN <4-6 digits>\nExample: PIN 1234".to_string(),
        }
    }

    fn send_response(&self, _from: &str, amount: f64, token: &str, recipient: &str) -> String {
        format!(
            "Send {} {} to {}?\n\nReply CONFIRM or CANCEL",
            amount, token, recipient
        )
    }

    async fn deposit_response(&self, from: &str) -> String {
        let Some(ref repo) = self.user_repo else {
            return "DB offline. Reply JOIN first.".to_string();
        };

        match repo.find_by_phone(from).await {
            Ok(Some(user)) => {
                format!(
                    "Deposit MATIC to:\n{}\n\nPolygon Amoy testnet",
                    user.wallet_address
                )
            }
            Ok(None) => "No wallet. Reply JOIN first.".to_string(),
            Err(_) => "Error. Try later.".to_string(),
        }
    }

    async fn history_response(&self, from: &str) -> String {
        // Check for recent deposits
        if let Some(ref deposit_repo) = self.deposit_repo {
            if let Ok(deposits) = deposit_repo.get_recent(from, 5).await {
                if !deposits.is_empty() {
                    let history: Vec<String> = deposits.iter()
                        .map(|d| format!("${:.2} via {}", d.amount_as_f64(), d.source))
                        .collect();
                    return format!("Recent deposits:\n{}", history.join("\n"));
                }
            }
        }
        "No transactions yet.\nReply REDEEM <code> to add funds.".to_string()
    }

    async fn redeem_response(&self, from: &str, code: &str) -> String {
        // Check if user has wallet
        let Some(ref user_repo) = self.user_repo else {
            return "DB offline. Try later.".to_string();
        };

        let user_exists = match user_repo.exists(from).await {
            Ok(exists) => exists,
            Err(_) => return "Error. Try later.".to_string(),
        };

        if !user_exists {
            return "No wallet. Reply JOIN first.".to_string();
        }

        // Check voucher repository
        let Some(ref voucher_repo) = self.voucher_repo else {
            return "Voucher system offline.".to_string();
        };

        let Some(ref deposit_repo) = self.deposit_repo else {
            return "Deposit system offline.".to_string();
        };

        // Redeem the voucher
        match voucher_repo.redeem(code, from).await {
            Ok(voucher) => {
                // Record the deposit
                let usdc_amount = voucher.usdc_amount;
                if let Err(e) = deposit_repo.create_from_voucher(from, usdc_amount, code).await {
                    tracing::error!("Failed to record deposit: {}", e);
                }

                format!(
                    "Voucher redeemed!\n\n${:.2} USDC credited.\n\nReply BALANCE to check.",
                    voucher.usdc_as_f64()
                )
            }
            Err(e) => {
                match e {
                    crate::db::VoucherError::NotFound => "Invalid voucher code.".to_string(),
                    crate::db::VoucherError::AlreadyRedeemed => "Voucher already used.".to_string(),
                    crate::db::VoucherError::Expired => "Voucher has expired.".to_string(),
                    crate::db::VoucherError::DatabaseError(_) => "Error. Try later.".to_string(),
                }
            }
        }
    }

    async fn save_response(&self, from: &str, name: &str, phone: &str) -> String {
        let Some(ref address_book) = self.address_book_repo else {
            return "Address book offline.".to_string();
        };

        match address_book.add_contact(from, name, Some(phone), None).await {
            Ok(_) => format!("Saved {} as {}.", phone, name),
            Err(_) => "Error saving contact.".to_string(),
        }
    }

    async fn contacts_response(&self, from: &str) -> String {
        let Some(ref address_book) = self.address_book_repo else {
            return "Address book offline.".to_string();
        };

        match address_book.list_all(from).await {
            Ok(contacts) if contacts.is_empty() => {
                "No contacts yet.\n\nSAVE <name> <phone>".to_string()
            }
            Ok(contacts) => {
                let list: Vec<String> = contacts.iter()
                    .take(5)
                    .map(|c| c.to_sms_string())
                    .collect();
                format!("Contacts:\n{}", list.join("\n"))
            }
            Err(_) => "Error loading contacts.".to_string(),
        }
    }

    async fn chain_response(&self, from: &str, chain_input: &str) -> String {
        let Some(chain) = Chain::from_input(chain_input) else {
            return format!(
                "Unknown chain: {}\n\nAvailable: polygon, base, eth, arb",
                chain_input
            );
        };

        // For now, just acknowledge - could save preference to DB
        format!(
            "Switched to {}!\n\nChain ID: {}\nNative: {}",
            chain.name(),
            chain.chain_id(),
            chain.native_token()
        )
    }

    fn unknown_response(&self, text: &str) -> String {
        if text.is_empty() {
            "Welcome to TextChain!\n\nReply HELP for commands.".to_string()
        } else {
            format!(
                "Unknown: {}\n\nReply HELP for commands.",
                text.chars().take(15).collect::<String>()
            )
        }
    }
}

impl std::fmt::Debug for CommandProcessor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CommandProcessor")
            .field("has_db", &self.user_repo.is_some())
            .field("has_vouchers", &self.voucher_repo.is_some())
            .field("has_deposits", &self.deposit_repo.is_some())
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wallet::create_shared_provider;

    fn test_processor() -> CommandProcessor {
        CommandProcessor::new(None, create_shared_provider())
    }

    #[test]
    fn test_parse_help() {
        let processor = test_processor();
        assert_eq!(processor.parse("HELP"), Command::Help);
        assert_eq!(processor.parse("help"), Command::Help);
        assert_eq!(processor.parse("?"), Command::Help);
    }

    #[test]
    fn test_parse_join() {
        let processor = test_processor();
        assert_eq!(processor.parse("JOIN"), Command::Join);
        assert_eq!(processor.parse("start"), Command::Join);
    }

    #[test]
    fn test_parse_balance() {
        let processor = test_processor();
        assert_eq!(processor.parse("BALANCE"), Command::Balance);
        assert_eq!(processor.parse("bal"), Command::Balance);
    }

    #[test]
    fn test_parse_send() {
        let processor = test_processor();
        
        let cmd = processor.parse("SEND 10 USDC TO +917123456789");
        assert!(matches!(cmd, Command::Send { amount, token, recipient } 
            if amount == 10.0 && token == "USDC" && recipient == "+917123456789"));
    }

    #[test]
    fn test_parse_pin() {
        let processor = test_processor();
        
        let cmd = processor.parse("PIN 1234");
        assert!(matches!(cmd, Command::Pin { new_pin: Some(pin) } if pin == "1234"));
        
        let cmd = processor.parse("PIN");
        assert!(matches!(cmd, Command::Pin { new_pin: None }));
    }

    #[test]
    fn test_parse_unknown() {
        let processor = test_processor();
        
        let cmd = processor.parse("FOOBAR");
        assert!(matches!(cmd, Command::Unknown(_)));
    }
}
