use crate::settings::TextReplacement;
use natural::phonetics::soundex;
use once_cell::sync::Lazy;
use regex::Regex;
use strsim::levenshtein;

/// Builds an n-gram string by cleaning and concatenating words
///
/// Strips punctuation from each word, lowercases, and joins without spaces.
/// This allows matching "Charge B" against "ChargeBee".
fn build_ngram(words: &[&str]) -> String {
    words
        .iter()
        .map(|w| {
            w.trim_matches(|c: char| !c.is_alphanumeric())
                .to_lowercase()
        })
        .collect::<Vec<_>>()
        .concat()
}

/// Finds the best matching custom word for a candidate string
///
/// Uses Levenshtein distance and Soundex phonetic matching to find
/// the best match above the given threshold.
///
/// # Arguments
/// * `candidate` - The cleaned/lowercased candidate string to match
/// * `custom_words` - Original custom words (for returning the replacement)
/// * `custom_words_nospace` - Custom words with spaces removed, lowercased (for comparison)
/// * `threshold` - Maximum similarity score to accept
///
/// # Returns
/// The best matching custom word and its score, if any match was found
fn find_best_match<'a>(
    candidate: &str,
    custom_words: &'a [String],
    custom_words_nospace: &[String],
    threshold: f64,
) -> Option<(&'a String, f64)> {
    if candidate.is_empty() || candidate.len() > 50 {
        return None;
    }

    let mut best_match: Option<&String> = None;
    let mut best_score = f64::MAX;

    for (i, custom_word_nospace) in custom_words_nospace.iter().enumerate() {
        // Skip if lengths are too different (optimization + prevents over-matching)
        // Use percentage-based check: max 25% length difference (prevents n-grams from
        // matching significantly shorter custom words, e.g., "openaigpt" vs "openai")
        let len_diff = (candidate.len() as i32 - custom_word_nospace.len() as i32).abs() as f64;
        let max_len = candidate.len().max(custom_word_nospace.len()) as f64;
        let max_allowed_diff = (max_len * 0.25).max(2.0); // At least 2 chars difference allowed
        if len_diff > max_allowed_diff {
            continue;
        }

        // Calculate Levenshtein distance (normalized by length)
        let levenshtein_dist = levenshtein(candidate, custom_word_nospace);
        let max_len = candidate.len().max(custom_word_nospace.len()) as f64;
        let levenshtein_score = if max_len > 0.0 {
            levenshtein_dist as f64 / max_len
        } else {
            1.0
        };

        // Calculate phonetic similarity using Soundex
        let phonetic_match = soundex(candidate, custom_word_nospace);

        // Combine scores: favor phonetic matches, but also consider string similarity
        let combined_score = if phonetic_match {
            levenshtein_score * 0.3 // Give significant boost to phonetic matches
        } else {
            levenshtein_score
        };

        // Accept if the score is good enough (configurable threshold)
        if combined_score < threshold && combined_score < best_score {
            best_match = Some(&custom_words[i]);
            best_score = combined_score;
        }
    }

    best_match.map(|m| (m, best_score))
}

/// Applies custom word corrections to transcribed text using fuzzy matching
///
/// This function corrects words in the input text by finding the best matches
/// from a list of custom words using a combination of:
/// - Levenshtein distance for string similarity
/// - Soundex phonetic matching for pronunciation similarity
/// - N-gram matching for multi-word speech artifacts (e.g., "Charge B" -> "ChargeBee")
///
/// # Arguments
/// * `text` - The input text to correct
/// * `custom_words` - List of custom words to match against
/// * `threshold` - Maximum similarity score to accept (0.0 = exact match, 1.0 = any match)
///
/// # Returns
/// The corrected text with custom words applied
pub fn apply_custom_words(text: &str, custom_words: &[String], threshold: f64) -> String {
    if custom_words.is_empty() {
        return text.to_string();
    }

    // Pre-compute lowercase versions to avoid repeated allocations
    let custom_words_lower: Vec<String> = custom_words.iter().map(|w| w.to_lowercase()).collect();

    // Pre-compute versions with spaces removed for n-gram comparison
    let custom_words_nospace: Vec<String> = custom_words_lower
        .iter()
        .map(|w| w.replace(' ', ""))
        .collect();

    let words: Vec<&str> = text.split_whitespace().collect();
    let mut result = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let mut matched = false;

        // Try n-grams from longest (3) to shortest (1) - greedy matching
        for n in (1..=3).rev() {
            if i + n > words.len() {
                continue;
            }

            let ngram_words = &words[i..i + n];
            let ngram = build_ngram(ngram_words);

            if let Some((replacement, _score)) =
                find_best_match(&ngram, custom_words, &custom_words_nospace, threshold)
            {
                // Extract punctuation from first and last words of the n-gram
                let (prefix, _) = extract_punctuation(ngram_words[0]);
                let (_, suffix) = extract_punctuation(ngram_words[n - 1]);

                // Preserve case from first word
                let corrected = preserve_case_pattern(ngram_words[0], replacement);

                result.push(format!("{}{}{}", prefix, corrected, suffix));
                i += n;
                matched = true;
                break;
            }
        }

        if !matched {
            result.push(words[i].to_string());
            i += 1;
        }
    }

    result.join(" ")
}

/// Preserves the case pattern of the original word when applying a replacement
fn preserve_case_pattern(original: &str, replacement: &str) -> String {
    if original.chars().all(|c| c.is_uppercase()) {
        replacement.to_uppercase()
    } else if original.chars().next().map_or(false, |c| c.is_uppercase()) {
        let mut chars: Vec<char> = replacement.chars().collect();
        if let Some(first_char) = chars.get_mut(0) {
            *first_char = first_char.to_uppercase().next().unwrap_or(*first_char);
        }
        chars.into_iter().collect()
    } else {
        replacement.to_string()
    }
}

/// Extracts punctuation prefix and suffix from a word
fn extract_punctuation(word: &str) -> (&str, &str) {
    let prefix_end = word.chars().take_while(|c| !c.is_alphanumeric()).count();
    let suffix_start = word
        .char_indices()
        .rev()
        .take_while(|(_, c)| !c.is_alphanumeric())
        .count();

    let prefix = if prefix_end > 0 {
        &word[..prefix_end]
    } else {
        ""
    };

    let suffix = if suffix_start > 0 {
        &word[word.len() - suffix_start..]
    } else {
        ""
    };

    (prefix, suffix)
}

/// Filler words to remove from transcriptions
const FILLER_WORDS: &[&str] = &[
    "uh", "um", "uhm", "umm", "uhh", "uhhh", "ah", "eh", "hmm", "hm", "mmm", "mm", "mh", "ha",
    "ehh",
];

static MULTI_SPACE_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s{2,}").unwrap());

/// Collapses repeated words (3+ repetitions) to a single instance.
/// E.g., "wh wh wh wh" -> "wh", "I I I I" -> "I", "the the the" -> "the"
fn collapse_stutters(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return text.to_string();
    }

    let mut result: Vec<&str> = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let word = words[i];
        let word_lower = word.to_lowercase();


        if word_lower.chars().all(|c| c.is_alphabetic()) {
            // Count consecutive repetitions (case-insensitive)
            let mut count = 1;
            while i + count < words.len() && words[i + count].to_lowercase() == word_lower {
                count += 1;
            }

            // If 3+ repetitions, collapse to single instance
            if count >= 3 {
                result.push(word);
                i += count;
            } else {
                result.push(word);
                i += 1;
            }
        } else {
            result.push(word);
            i += 1;
        }
    }

    result.join(" ")
}

/// Pre-compiled filler word patterns (built lazily)
static FILLER_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    FILLER_WORDS
        .iter()
        .map(|word| {
            // Match filler word with word boundaries, optionally followed by comma or period
            Regex::new(&format!(r"(?i)\b{}\b[,.]?", regex::escape(word))).unwrap()
        })
        .collect()
});

/// Collapse runs of the same non-alphanumeric character repeated 4+ times.
/// E.g. "Hello!!!!!!!!!!" → "Hello!", "text......" → "text."
fn collapse_repeated_chars(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();

    while let Some(ch) = chars.next() {
        result.push(ch);
        if !ch.is_alphanumeric() && !ch.is_whitespace() {
            let mut count = 1;
            while chars.peek() == Some(&ch) {
                chars.next();
                count += 1;
            }
            // If 4+ repeats, it's a hallucination — keep at most 1
            if count >= 4 {
                // already pushed one above, skip the rest
            } else {
                // Push the remaining occurrences (less than 4 total)
                for _ in 1..count {
                    result.push(ch);
                }
            }
        }
    }

    result
}

/// Collapse spaced-out repeated punctuation like "! ! ! ! !" or ". . . ."
/// If the same punctuation character appears 4+ times separated by spaces,
/// strip the whole sequence.
fn collapse_spaced_repeated_punctuation(text: &str) -> String {
    let mut result = text.to_string();
    // Check common hallucination punctuation characters
    for ch in ['!', '?', '.', ',', ';', '-', '*', '#'] {
        let spaced = format!("{ch} {ch} {ch} {ch}"); // 4+ spaced repeats
        if result.contains(&spaced) {
            // Remove all occurrences of "X " followed by more X's
            // by repeatedly replacing "X X" with "X" until stable
            let double = format!("{ch} {ch}");
            let single = format!("{ch}");
            while result.contains(&double) {
                result = result.replace(&double, &single);
            }
        }
    }
    result
}

/// Returns true if the text is purely punctuation / non-alphabetic noise,
/// i.e. it contains no actual word content.  Used to detect hallucinated
/// chunks that are nothing but "!", "...", "¡¡¡", etc.
fn is_punctuation_only(text: &str) -> bool {
    let trimmed = text.trim();
    !trimmed.is_empty() && !trimmed.chars().any(|c| c.is_alphabetic())
}

/// Filters transcription output by removing filler words and stutter artifacts.
///
/// This function cleans up raw transcription text by:
/// 1. Removing filler words (uh, um, hmm, etc.)
/// 2. Collapsing repeated 1-2 letter stutters (e.g., "wh wh wh" -> "wh")
/// 3. Cleaning up excess whitespace
/// 4. Detecting purely punctuation/noise output (hallucination) and returning empty
///
/// # Arguments
/// * `text` - The raw transcription text to filter
///
/// # Returns
/// The filtered text with filler words and stutters removed
pub fn filter_transcription_output(text: &str) -> String {
    let mut filtered = text.to_string();

    // Remove filler words
    for pattern in FILLER_PATTERNS.iter() {
        filtered = pattern.replace_all(&filtered, "").to_string();
    }

    // Collapse repeated 1-2 letter words (stutter artifacts like "wh wh wh wh")
    filtered = collapse_stutters(&filtered);

    // Remove hallucinated repeated characters (e.g. "!!!!!!", "......", "??????")
    // Any single non-alphanumeric character repeated 4+ times is collapsed to 1
    filtered = collapse_repeated_chars(&filtered);

    // Remove spaced-out hallucinations like "! ! ! ! !" or ". . . . ."
    filtered = collapse_spaced_repeated_punctuation(&filtered);

    // Clean up multiple spaces to single space
    filtered = MULTI_SPACE_PATTERN.replace_all(&filtered, " ").to_string();

    // Trim leading/trailing whitespace
    let filtered = filtered.trim().to_string();

    // If after all filtering the result is purely punctuation / no real words,
    // treat it as hallucinated noise and return empty.
    if is_punctuation_only(&filtered) {
        return String::new();
    }

    filtered
}

/// Applies explicit text replacement rules to transcribed text.
///
/// Unlike `apply_custom_words` which uses fuzzy/phonetic matching, this function
/// performs exact string replacement. Each rule specifies a "find" string and a
/// "replace" string, with an optional case-sensitivity flag.
///
/// Replacements are applied in order, so earlier rules can affect later ones.
///
/// # Arguments
/// * `text` - The input text to apply replacements to
/// * `replacements` - Ordered list of replacement rules
///
/// # Returns
/// The text with all matching replacements applied
pub fn apply_text_replacements(text: &str, replacements: &[TextReplacement]) -> String {
    if replacements.is_empty() {
        return text.to_string();
    }

    let mut result = text.to_string();

    for replacement in replacements {
        if replacement.find.is_empty() {
            continue;
        }

        if replacement.case_sensitive {
            result = result.replace(&replacement.find, &replacement.replace);
        } else {
            // Case-insensitive replacement without regex:
            // Find all occurrences by searching in the lowercased version,
            // then replace in the original string from right to left to preserve indices.
            let lower_result = result.to_lowercase();
            let lower_find = replacement.find.to_lowercase();
            let find_len = replacement.find.len();

            let mut positions: Vec<usize> = Vec::new();
            let mut start = 0;
            while let Some(pos) = lower_result[start..].find(&lower_find) {
                positions.push(start + pos);
                start += pos + find_len;
            }

            // Replace from right to left so indices remain valid
            for &pos in positions.iter().rev() {
                result.replace_range(pos..pos + find_len, &replacement.replace);
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_custom_words_exact_match() {
        let text = "hello world";
        let custom_words = vec!["Hello".to_string(), "World".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "Hello World");
    }

    #[test]
    fn test_apply_custom_words_fuzzy_match() {
        let text = "helo wrold";
        let custom_words = vec!["hello".to_string(), "world".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_preserve_case_pattern() {
        assert_eq!(preserve_case_pattern("HELLO", "world"), "WORLD");
        assert_eq!(preserve_case_pattern("Hello", "world"), "World");
        assert_eq!(preserve_case_pattern("hello", "WORLD"), "WORLD");
    }

    #[test]
    fn test_extract_punctuation() {
        assert_eq!(extract_punctuation("hello"), ("", ""));
        assert_eq!(extract_punctuation("!hello?"), ("!", "?"));
        assert_eq!(extract_punctuation("...hello..."), ("...", "..."));
    }

    #[test]
    fn test_empty_custom_words() {
        let text = "hello world";
        let custom_words = vec![];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_filter_filler_words() {
        let text = "So um I was thinking uh about this";
        let result = filter_transcription_output(text);
        assert_eq!(result, "So I was thinking about this");
    }

    #[test]
    fn test_filter_filler_words_case_insensitive() {
        let text = "UM this is UH a test";
        let result = filter_transcription_output(text);
        assert_eq!(result, "this is a test");
    }

    #[test]
    fn test_filter_filler_words_with_punctuation() {
        let text = "Well, um, I think, uh. that's right";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Well, I think, that's right");
    }

    #[test]
    fn test_filter_cleans_whitespace() {
        let text = "Hello    world   test";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Hello world test");
    }

    #[test]
    fn test_filter_trims() {
        let text = "  Hello world  ";
        let result = filter_transcription_output(text);
        assert_eq!(result, "Hello world");
    }

    #[test]
    fn test_filter_combined() {
        let text = "  Um, so I was, uh, thinking about this  ";
        let result = filter_transcription_output(text);
        assert_eq!(result, "so I was, thinking about this");
    }

    #[test]
    fn test_filter_preserves_valid_text() {
        let text = "This is a completely normal sentence.";
        let result = filter_transcription_output(text);
        assert_eq!(result, "This is a completely normal sentence.");
    }

    #[test]
    fn test_filter_stutter_collapse() {
        let text = "w wh wh wh wh wh wh wh wh wh why";
        let result = filter_transcription_output(text);
        assert_eq!(result, "w wh why");
    }

    #[test]
    fn test_filter_stutter_short_words() {
        let text = "I I I I think so so so so";
        let result = filter_transcription_output(text);
        assert_eq!(result, "I think so");
    }

    #[test]
    fn test_filter_stutter_mixed_case() {
        let text = "No NO no NO no";
        let result = filter_transcription_output(text);
        assert_eq!(result, "No");
    }

    #[test]
    fn test_filter_stutter_preserves_two_repetitions() {
        let text = "no no is fine";
        let result = filter_transcription_output(text);
        assert_eq!(result, "no no is fine");
    }

    #[test]
    fn test_apply_custom_words_ngram_two_words() {
        let text = "il cui nome è Charge B, che permette";
        let custom_words = vec!["ChargeBee".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("ChargeBee,"));
        assert!(!result.contains("Charge B"));
    }

    #[test]
    fn test_apply_custom_words_ngram_three_words() {
        let text = "use Chat G P T for this";
        let custom_words = vec!["ChatGPT".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("ChatGPT"));
    }

    #[test]
    fn test_apply_custom_words_prefers_longer_ngram() {
        let text = "Open AI GPT model";
        let custom_words = vec!["OpenAI".to_string(), "GPT".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "OpenAI GPT model");
    }

    #[test]
    fn test_apply_custom_words_ngram_preserves_case() {
        let text = "CHARGE B is great";
        let custom_words = vec!["ChargeBee".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("CHARGEBEE"));
    }

    #[test]
    fn test_apply_custom_words_ngram_with_spaces_in_custom() {
        // Custom word with space should also match against split words
        let text = "using Mac Book Pro";
        let custom_words = vec!["MacBook Pro".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("MacBook"));
    }

    #[test]
    fn test_filter_stutter_longer_words() {
        // Parakeet v3 can produce long repeated words (PR #976)
        let text = "hello hello hello hello world";
        let result = filter_transcription_output(text);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_filter_stutter_sentence_like_repeats() {
        let text = "the the the the quick brown fox";
        let result = filter_transcription_output(text);
        assert_eq!(result, "the quick brown fox");
    }

    #[test]
    fn test_apply_custom_words_trailing_number_not_doubled() {
        // Verify that trailing non-alpha chars (like numbers) aren't double-counted
        // between build_ngram stripping them and extract_punctuation capturing them
        let text = "use GPT4 for this";
        let custom_words = vec!["GPT-4".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        // Should NOT produce "GPT-44" (double-counting the trailing 4)
        assert!(
            !result.contains("GPT-44"),
            "got double-counted result: {}",
            result
        );
    }

    #[test]
    fn test_text_replacements_basic() {
        let replacements = vec![TextReplacement {
            find: "gonna".to_string(),
            replace: "going to".to_string(),
            case_sensitive: false,
        }];
        let result = apply_text_replacements("I'm gonna do it", &replacements);
        assert_eq!(result, "I'm going to do it");
    }

    #[test]
    fn test_text_replacements_case_sensitive() {
        let replacements = vec![TextReplacement {
            find: "API".to_string(),
            replace: "Application Programming Interface".to_string(),
            case_sensitive: true,
        }];
        assert_eq!(
            apply_text_replacements("The API is great", &replacements),
            "The Application Programming Interface is great"
        );
        // Should NOT match lowercase "api"
        assert_eq!(
            apply_text_replacements("The api is great", &replacements),
            "The api is great"
        );
    }

    #[test]
    fn test_text_replacements_case_insensitive() {
        let replacements = vec![TextReplacement {
            find: "gonna".to_string(),
            replace: "going to".to_string(),
            case_sensitive: false,
        }];
        assert_eq!(
            apply_text_replacements("GONNA do it", &replacements),
            "going to do it"
        );
        assert_eq!(
            apply_text_replacements("Gonna do it", &replacements),
            "going to do it"
        );
    }

    #[test]
    fn test_text_replacements_empty() {
        let result = apply_text_replacements("hello world", &[]);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_text_replacements_empty_find() {
        let replacements = vec![TextReplacement {
            find: "".to_string(),
            replace: "something".to_string(),
            case_sensitive: false,
        }];
        let result = apply_text_replacements("hello world", &replacements);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_text_replacements_multiple() {
        let replacements = vec![
            TextReplacement {
                find: "gonna".to_string(),
                replace: "going to".to_string(),
                case_sensitive: false,
            },
            TextReplacement {
                find: "wanna".to_string(),
                replace: "want to".to_string(),
                case_sensitive: false,
            },
        ];
        let result = apply_text_replacements("I'm gonna wanna do it", &replacements);
        assert_eq!(result, "I'm going to want to do it");
    }

    #[test]
    fn test_text_replacements_delete() {
        // Replace with empty string to delete text
        let replacements = vec![TextReplacement {
            find: "um ".to_string(),
            replace: "".to_string(),
            case_sensitive: false,
        }];
        let result = apply_text_replacements("I um think so", &replacements);
        assert_eq!(result, "I think so");
    }

    #[test]
    fn test_filter_punctuation_only_hallucination() {
        // Pure punctuation should be treated as hallucination
        assert_eq!(filter_transcription_output("!"), "");
        assert_eq!(filter_transcription_output("! ! ! ! !"), "");
        assert_eq!(filter_transcription_output("..."), "");
        assert_eq!(filter_transcription_output("? ? ?"), "");
        assert_eq!(filter_transcription_output("!!!"), "");
        assert_eq!(filter_transcription_output(" - "), "");
    }

    #[test]
    fn test_filter_preserves_text_with_punctuation() {
        // Text with real words should be preserved
        assert_eq!(
            filter_transcription_output("Hello!"),
            "Hello!"
        );
        assert_eq!(
            filter_transcription_output("Bonjour, comment ça va?"),
            "Bonjour, comment ça va?"
        );
    }
}
