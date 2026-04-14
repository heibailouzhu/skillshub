use clap::{Parser, Subcommand};

use crate::commands::{config::ConfigCommand, install::InstallCommand, login::LoginCommand, logout::LogoutCommand, package::PackageCommand, publish::PublishCommand, uninstall::UninstallCommand, whoami::WhoamiCommand};

#[derive(Debug, Parser)]
#[command(name = "skhub", version, about = "SkillShub Rust CLI")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Debug, Subcommand)]
pub enum Commands {
    Config(ConfigCommand),
    Login(LoginCommand),
    Logout(LogoutCommand),
    Whoami(WhoamiCommand),
    Package(PackageCommand),
    Publish(PublishCommand),
    Install(InstallCommand),
    Uninstall(UninstallCommand),
}
