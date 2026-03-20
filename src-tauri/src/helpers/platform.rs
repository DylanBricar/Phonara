pub fn is_flatpak() -> bool {
    std::path::Path::new("/.flatpak-info").exists()
}
