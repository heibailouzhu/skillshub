use anyhow::Result;

use skillshub_cli::cli::{Cli, Commands};

#[tokio::main]
async fn main() -> Result<()> {
    let cli = <Cli as clap::Parser>::parse();
    match cli.command {
        Commands::Config(cmd) => cmd.run().await,
        Commands::Login(cmd) => cmd.run().await,
        Commands::Logout(cmd) => cmd.run().await,
        Commands::Whoami(cmd) => cmd.run().await,
        Commands::Package(cmd) => cmd.run().await,
        Commands::Publish(cmd) => cmd.run().await,
        Commands::Install(cmd) => cmd.run().await,
        Commands::Uninstall(cmd) => cmd.run().await,
    }
}
