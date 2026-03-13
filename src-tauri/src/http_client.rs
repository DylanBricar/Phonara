use once_cell::sync::Lazy;
use std::time::Duration;

static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .expect("Failed to build shared HTTP client")
});

pub fn client() -> &'static reqwest::Client {
    &HTTP_CLIENT
}
