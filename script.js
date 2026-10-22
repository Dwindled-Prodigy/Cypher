'use strict';

// Crypt Diary's custom substitution table. Each input character maps to one cipher symbol.
const CHAR_TO_CIPHER = {
  A: 'ᛉ', B: 'ᛦ', C: 'λ', D: '𒉭', E: 'Δ', F: 'ᛟ', G: 'ᚼ', H: 'ф', I: 'ᛇ',
  J: 'Ω', K: 'ᛊ', L: 'И', M: 'β', N: 'ᛝ', O: 'ω', P: 'ε', Q: 'Э', R: 'ψ',
  S: 'θ', T: 'δ', U: 'Я', V: 'ᛞ', W: 'ρ', X: 'ю', Y: 'μ', Z: 'π',
  '1': 'P', '2': 'J', '3': 'U', '4': 'L', '5': 'Z', '6': 'A', '7': 'S',
  '8': 'C', '9': 'F', '0': 'K',
  ' ': 'ᚬ',
  '&': 'Λ'
};
const CIPHER_TO_CHAR = Object.fromEntries(Object.entries(CHAR_TO_CIPHER).map(([char, cipher]) => [cipher, char]));

// This order reproduces the user's confirmed sample. It must be a permutation of 1..7.
const DEFAULT_ORDER = '1475236';
let columnOrder = parseOrder(DEFAULT_ORDER);
let mode = 'encrypt';
let lastResult = '';

const $ = (id) => document.getElementById(id);
const sourceText = $('source-text');
const resultText = $('result-text');
const runButton = $('run-button');
const copyButton = $('copy-button');
const swapButton = $('swap-button');
const messageBar = $('message-bar');
const columnOrderInput = $('column-order');

function parseOrder(value) {
  const digits = Array.from(String(value).replace(/\s+/g, ''));
  if (digits.length !== 7 || digits.some((digit) => !/[1-7]/.test(digit)) || new Set(digits).size !== 7) {
    throw new Error('Column order must contain each digit from 1 through 7 exactly once.');
  }
  return digits.map(Number);
}

function normalizePlaintext(text) {
  // Newlines/tabs act as word separators. Punctuation and unsupported characters are stripped.
  const upper = text.toUpperCase().replace(/[\r\n\t]+/g, ' ');
  const cleaned = upper.replace(/[^A-Z0-9 ]/g, '').replace(/ {2,}/g, ' ').trim();
  if (!cleaned) throw new Error('Enter a message containing English letters, digits, or spaces.');
  return cleaned;
}

function chunkAndPad(text) {
  const chars = Array.from(text);
  while (chars.length % 7 !== 0) chars.push('&');
  const rows = [];
  for (let i = 0; i < chars.length; i += 7) rows.push(chars.slice(i, i + 7));
  return rows;
}

function encrypt(plaintext) {
  const clean = normalizePlaintext(plaintext);
  const rows = chunkAndPad(clean); // One seven-character segment per row.

  // Transpose N×7 into 7×N, then reorder those seven rows using the secret order.
  const transposed = Array.from({ length: 7 }, (_, column) => rows.map((row) => row[column]));
  const reorderedRows = columnOrder.map((oneBasedIndex) => transposed[oneBasedIndex - 1]);
  const rearranged = reorderedRows.flat();

  const unknown = [...new Set(rearranged.filter((char) => !(char in CHAR_TO_CIPHER)))];
  if (unknown.length) throw new Error(`Unsupported character(s): ${unknown.join(' ')}`);
  return { output: rearranged.map((char) => CHAR_TO_CIPHER[char]).join(''), normalized: clean, paddedLength: rearranged.length };
}

function decrypt(ciphertext) {
  // Cipher spaces/newlines are only visual formatting; actual spaces are encoded as ᚬ.
  const wrapped = ciphertext.trim().replace(/^<([\s\S]*)>$/, '$1');
  const chars = Array.from(wrapped.replace(/\s+/g, ''));
  if (!chars.length) throw new Error('Paste a coded message to decrypt.');

  const invalid = [...new Set(chars.filter((char) => !(char in CIPHER_TO_CHAR)))];
  if (invalid.length) {
    const shown = invalid.slice(0, 8).join(' ');
    throw new Error(`Unknown cipher character(s): ${shown}${invalid.length > 8 ? ' …' : ''}. Check that the full code was pasted.`);
  }

  if (chars.length % 7 !== 0) {
    throw new Error(`This cipher has ${chars.length} symbols. Its length must be a multiple of 7; the message may be incomplete.`);
  }

  const rearranged = chars.map((char) => CIPHER_TO_CHAR[char]);
  const columnsCount = chars.length / 7;
  const shuffledRows = [];
  for (let row = 0; row < 7; row++) {
    shuffledRows.push(rearranged.slice(row * columnsCount, (row + 1) * columnsCount));
  }

  // Invert the row permutation, restoring the seven rows of the transposed matrix.
  const transposed = Array(7);
  columnOrder.forEach((originalRowNumber, shuffledIndex) => {
    transposed[originalRowNumber - 1] = shuffledRows[shuffledIndex];
  });

  // Transpose back to the seven-character segments, then remove only final padding.
  const originalChars = [];
  for (let row = 0; row < columnsCount; row++) {
    for (let column = 0; column < 7; column++) originalChars.push(transposed[column][row]);
  }
  return originalChars.join('').replace(/&+$/, '');
}

function showMessage(text, kind = 'info') {
  messageBar.textContent = text;
  messageBar.dataset.kind = kind;
  messageBar.hidden = false;
}
function clearMessage() { messageBar.hidden = true; messageBar.textContent = ''; }
function setMode(nextMode) {
  mode = nextMode;
  const encrypting = mode === 'encrypt';
  $('encrypt-tab').classList.toggle('active', encrypting);
  $('decrypt-tab').classList.toggle('active', !encrypting);
  $('encrypt-tab').setAttribute('aria-selected', String(encrypting));
  $('decrypt-tab').setAttribute('aria-selected', String(!encrypting));
  $('workspace').setAttribute('aria-labelledby', encrypting ? 'encrypt-tab' : 'decrypt-tab');
  $('input-kicker').textContent = encrypting ? 'STEP 01 / PLAINTEXT' : 'STEP 01 / CIPHER TEXT';
  $('input-title').textContent = encrypting ? 'Write your message' : 'Paste the coded message';
  $('source-label').textContent = encrypting ? 'Message to encrypt' : 'Cipher text to decrypt';
  sourceText.placeholder = encrypting ? 'Type or paste your message here…' : 'Paste your coded symbols here…';
  $('input-footnote').textContent = encrypting
    ? 'Punctuation is removed. Spaces are kept. Letters become uppercase.'
    : 'Line breaks are ignored. Keep every cipher symbol, including Λ and ᚬ.';
  $('output-kicker').textContent = encrypting ? 'STEP 02 / ENCRYPTED TEXT' : 'STEP 02 / PLAINTEXT';
  $('output-title').textContent = encrypting ? 'Your cipher' : 'Recovered message';
  $('run-label').textContent = encrypting ? 'Encrypt message' : 'Decrypt message';
  $('result-count').textContent = 'Waiting for input';
  resultText.value = '';
  lastResult = '';
  copyButton.disabled = true;
  swapButton.disabled = true;
  clearMessage();
  sourceText.focus();
}

function run() {
  clearMessage();
  try {
    if (!sourceText.value.trim()) throw new Error(mode === 'encrypt' ? 'Enter a message to encrypt.' : 'Paste a coded message to decrypt.');
    if (mode === 'encrypt') {
      const result = encrypt(sourceText.value);
      resultText.value = result.output;
      $('result-count').textContent = `${Array.from(result.output).length} symbols · ${result.normalized.length} characters before padding`;
      const preCleaned = sourceText.value.toUpperCase().replace(/[\r\n\t]+/g, ' ');
      const padding = result.paddedLength - result.normalized.length;
      const info = [padding ? `${padding} padding character${padding === 1 ? '' : 's'} added` : 'No padding needed', preCleaned !== result.normalized ? 'punctuation/extra whitespace normalized' : 'input kept'].join(' · ');
      showMessage(`Encrypted successfully. ${info}.`, 'success');
    } else {
      const plain = decrypt(sourceText.value);
      resultText.value = plain;
      $('result-count').textContent = `${Array.from(plain).length} characters recovered`;
      showMessage('Decrypted successfully using the current column order.', 'success');
    }
    lastResult = resultText.value;
    copyButton.disabled = !lastResult;
    swapButton.disabled = !lastResult;
    $('result-state').innerHTML = '<span class="status-dot"></span> Complete';
  } catch (error) {
    resultText.value = '';
    $('result-count').textContent = 'No result';
    copyButton.disabled = true;
    swapButton.disabled = true;
    $('result-state').textContent = 'Needs attention';
    showMessage(error.message || 'Something went wrong.', 'error');
  }
}

async function copyResult() {
  if (!lastResult) return;
  try {
    await navigator.clipboard.writeText(lastResult);
    copyButton.innerHTML = '<span aria-hidden="true">✓</span> Copied';
    window.setTimeout(() => { copyButton.innerHTML = '<span aria-hidden="true">▢</span> Copy'; }, 1400);
  } catch {
    resultText.focus();
    resultText.select();
    showMessage('Clipboard access was blocked. The result is selected; copy it with Ctrl+C or Cmd+C.', 'info');
  }
}

function swapResult() {
  if (!lastResult) return;
  const previousResult = lastResult;
  setMode(mode === 'encrypt' ? 'decrypt' : 'encrypt');
  sourceText.value = previousResult;
  $('input-count').textContent = `${Array.from(sourceText.value).length} chars`;
  run();
}

function applyOrder() {
  try {
    columnOrder = parseOrder(columnOrderInput.value);
    columnOrderInput.value = columnOrder.join('');
    showMessage(`Column order set to ${columnOrder.join('')}. Encrypt and decrypt with the same order.`, 'success');
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

$('encrypt-tab').addEventListener('click', () => setMode('encrypt'));
$('decrypt-tab').addEventListener('click', () => setMode('decrypt'));
runButton.addEventListener('click', run);
copyButton.addEventListener('click', copyResult);
swapButton.addEventListener('click', swapResult);
$('apply-order').addEventListener('click', applyOrder);
$('reset-order').addEventListener('click', () => {
  columnOrder = parseOrder(DEFAULT_ORDER);
  columnOrderInput.value = DEFAULT_ORDER;
  showMessage(`Column order reset to ${DEFAULT_ORDER}.`, 'success');
});
sourceText.addEventListener('input', () => {
  $('input-count').textContent = `${Array.from(sourceText.value).length} chars`;
});
sourceText.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') run();
});
