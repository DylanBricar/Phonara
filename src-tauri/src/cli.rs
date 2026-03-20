use clap::Parser;

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

    #[arg(long, help = "Force auto-submit after transcription (enter, ctrl+enter, cmd+enter)")]
    pub auto_submit: Option<String>,
}
