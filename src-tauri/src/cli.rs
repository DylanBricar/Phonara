use clap::Parser;
use std::path::PathBuf;

#[derive(Parser, Debug, Clone, Default)]
#[command(name = "phonara", about = "Phonara - Speech to Text")]
pub struct CliArgs {
    #[arg(long)]
    pub start_hidden: bool,

    #[arg(long)]
    pub no_tray: bool,

    #[arg(long)]
    pub toggle_transcription: bool,

    #[arg(long)]
    pub toggle_post_process: bool,

    #[arg(long)]
    pub cancel: bool,

    #[arg(long)]
    pub debug: bool,

    #[arg(long, help = "Start transcription immediately on launch")]
    pub transcribe: bool,

    #[arg(short = 'f', long, value_name = "WAV")]
    pub transcribe_file: Option<PathBuf>,

    #[arg(long)]
    pub model: Option<String>,

    #[arg(long, value_name = "N")]
    pub device_index: Option<usize>,

    #[arg(long)]
    pub list_devices: bool,

    #[arg(long)]
    pub list_models: bool,

    #[arg(long, value_name = "N")]
    pub repeat: Option<usize>,

    #[arg(long)]
    pub json: bool,

    #[arg(
        long,
        help = "Force auto-submit after transcription (enter, ctrl+enter, cmd+enter)"
    )]
    pub auto_submit: Option<String>,
}
