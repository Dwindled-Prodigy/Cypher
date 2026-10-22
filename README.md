# Crypt Diary

A static, browser-only HTML/CSS/JavaScript tool for the custom Crypt Diary symbol cipher. It has no backend and requires no package installation.

## Use locally

Open `index.html` in a modern browser. All cipher work happens in `script.js` in your browser.

## Host on GitHub Pages

1. Create a GitHub repository (for example, `crypt-diary`).
2. Upload `index.html`, `styles.css`, and `script.js` to the repository's root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, choose your default branch and `/(root)`, then save.
5. Wait for GitHub Pages to publish the static site and open the URL shown in that settings page.

## Algorithm implemented

1. Convert plaintext to uppercase, remove punctuation/unsupported characters, normalize whitespace, and preserve word spaces.
2. Split the text into seven-character rows and pad the final row with `&` until the length is a multiple of seven.
3. Transpose the `N × 7` grid into a `7 × N` grid.
4. Reorder its seven rows using `1475236` (the order that reproduces the confirmed example in the conversation).
5. Replace letters, digits, spaces, and padding using the custom mapping, then concatenate the result.
6. Decryption reverses those steps and removes trailing padding.

## Security

This is a personal substitution/transposition cipher, not modern cryptographic protection. Do not use it for passwords, account credentials, or information that requires strong confidentiality.
