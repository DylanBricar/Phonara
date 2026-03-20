#[allow(dead_code)]
pub fn is_flatpak() -> bool {
    std::path::Path::new("/.flatpak-info").exists()
}
