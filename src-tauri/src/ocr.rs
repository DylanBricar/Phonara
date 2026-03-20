use log::{debug, warn};

const MAX_OCR_TEXT_CHARS: usize = 8000;

pub fn fetch_ocr_text() -> String {
    let text = platform_ocr();
    if text.chars().count() > MAX_OCR_TEXT_CHARS {
        text.chars().take(MAX_OCR_TEXT_CHARS).collect()
    } else {
        text
    }
}

#[cfg(target_os = "macos")]
fn platform_ocr() -> String {
    use std::process::Command;

    let script = r#"
use framework "Vision"
use framework "AppKit"
use scripting additions

set tempFile to (POSIX path of (path to temporary items)) & "phonara_ocr.png"

do shell script "screencapture -x -o -l $(osascript -e 'tell application \"System Events\" to return id of first window of (first application process whose frontmost is true)') " & quoted form of tempFile

set imageURL to current application's NSURL's fileURLWithPath:tempFile
set imageSource to current application's NSImage's alloc()'s initWithContentsOfURL:imageURL

if imageSource is missing value then return ""

set requestHandler to current application's VNImageRequestHandler's alloc()'s initWithData:(imageSource's TIFFRepresentation()) options:(current application's NSDictionary's dictionary())
set ocrRequest to current application's VNRecognizeTextRequest's alloc()'s init()
ocrRequest's setRecognitionLevel:(current application's VNRequestTextRecognitionLevelAccurate)

requestHandler's performRequests:(current application's NSArray's arrayWithObject:ocrRequest) |error|:(missing value)

set ocrResults to ocrRequest's results()
set extractedText to ""

repeat with observation in ocrResults
    set topCandidate to (observation's topCandidates:1)'s firstObject()
    if topCandidate is not missing value then
        set extractedText to extractedText & (topCandidate's |string|() as text) & linefeed
    end if
end repeat

do shell script "rm -f " & quoted form of tempFile

return extractedText
"#;

    match Command::new("osascript").arg("-e").arg(script).output() {
        Ok(output) => {
            let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            debug!("OCR captured {} chars", text.len());
            text
        }
        Err(e) => {
            warn!("OCR capture failed: {}", e);
            String::new()
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn platform_ocr() -> String {
    debug!("OCR not supported on this platform");
    String::new()
}
