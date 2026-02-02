use std::env;

/// Application configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct Config {
    pub twilio: TwilioConfig,
    pub server: ServerConfig,
}

#[derive(Debug, Clone)]
pub struct TwilioConfig {
    pub account_sid: String,
    pub auth_token: String,
    pub phone_number: String,
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self, ConfigError> {
        dotenvy::dotenv().ok(); // Load .env file if present

        Ok(Config {
            twilio: TwilioConfig {
                account_sid: env::var("TWILIO_ACCOUNT_SID")
                    .map_err(|_| ConfigError::Missing("TWILIO_ACCOUNT_SID"))?,
                auth_token: env::var("TWILIO_AUTH_TOKEN")
                    .map_err(|_| ConfigError::Missing("TWILIO_AUTH_TOKEN"))?,
                phone_number: env::var("TWILIO_PHONE_NUMBER")
                    .map_err(|_| ConfigError::Missing("TWILIO_PHONE_NUMBER"))?,
            },
            server: ServerConfig {
                host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: env::var("SERVER_PORT")
                    .unwrap_or_else(|_| "3000".to_string())
                    .parse()
                    .map_err(|_| ConfigError::Invalid("SERVER_PORT"))?,
            },
        })
    }

    /// Get server bind address
    pub fn bind_addr(&self) -> String {
        format!("{}:{}", self.server.host, self.server.port)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    Missing(&'static str),
    #[error("Invalid value for: {0}")]
    Invalid(&'static str),
}
