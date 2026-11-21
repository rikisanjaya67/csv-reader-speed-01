// Fast drop-in for make.fun's csv-reader 1.0.0: run(input) returns exactly
// csv-reader's answer {columns, rows, errors} for every input, but scans with
// indexOf jumps instead of one character at a time.
//
// Semantics (identical to the reference): text is read once, left to right.
// A U+FEFF at the very start is dropped. A record ends at LF or CRLF; a line
// left with no characters is no record. Outside quotes a CR not followed by
// LF is dropped (error stray_cr). A field that opens with a quote runs to the
// next quote that is not doubled ("" inside it is one quote, each CRLF or
// lone CR inside it reads as LF); what follows its closing quote, up to the
// next comma or line break, is appended as it stands (quote_junk, when the
// field ends); a quote that never closes is a literal character, and the text
// after it is read again as unquoted (unterminated_quote). A quote inside an
// unquoted field is a literal character. Fields stay strings, never trimmed
// or converted. columns is the first record when header is true, else null;
// rows holds the records after it (every record when header is false), each
// padded with empty strings (short_row, with fields: its field count) or cut
// (long_row, with extra: the cut fields) to the first record's width. Each
// error is {code, line, row}, in the order met; a record's short_row or
// long_row when it ends: line the 1-based line its record starts on, and row
// its record's index in rows, null for the header.

const COMMA = 44;
const QUOTE = 34;
const LF = 10;
const CR = 13;
const BOM = 0xfeff;

/** csv-reader 1.0.0's answer for one case's input, computed fast. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const len = text.length;
  let pos = text.charCodeAt(0) === BOM ? 1 : 0;
  let line = 1;

  // The record being read: the line it starts on and the index in rows it
  // takes (null: the header). Errors use these as the reference does.
  let recordLine = 1;
  let recordRow = null;

  function error(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // Reads unquoted characters onto `value` up to the next comma or line
  // break: a CR not followed by LF is dropped (stray_cr). Returns the field
  // and how it ended; `added` counts the characters kept. The next comma or
  // LF bounds the scan for a CR, so a lone CR is found without scanning the
  // rest of the file.
  function readUnquoted(value, added) {
    while (pos < len) {
      const iComma = text.indexOf(',', pos);
      const iLF = text.indexOf('\n', pos);
      let m = iComma === -1 ? iLF : (iLF === -1 ? iComma : (iComma < iLF ? iComma : iLF));
      if (m === -1) {
        // No comma or LF remains, so every CR left is a lone CR: drop it
        // (stray_cr) instead of keeping it.
        const cr = text.indexOf('\r', pos);
        if (cr === -1) {
          value += text.slice(pos);
          added += len - pos;
          pos = len;
          return { value, ended: 'end', added };
        }
        value += text.slice(pos, cr);
        added += cr - pos;
        pos = cr + 1;
        error('stray_cr');
        continue;
      }
      let cr = -1;
      for (let i = pos; i < m; i++) {
        if (text.charCodeAt(i) === CR) { cr = i; break; }
      }
      if (cr === -1) {
        value += text.slice(pos, m);
        added += m - pos;
        if (text.charCodeAt(m) === COMMA) {
          pos = m + 1;
          return { value, ended: 'comma', added };
        }
        pos = m + 1;
        line += 1;
        return { value, ended: 'line break', added };
      }
      if (text.charCodeAt(cr + 1) === LF) {
        value += text.slice(pos, cr);
        added += cr - pos;
        pos = m + 1;
        line += 1;
        return { value, ended: 'line break', added };
      }
      value += text.slice(pos, cr);
      added += cr - pos;
      pos = cr + 1;
      error('stray_cr');
    }
    return { value, ended: 'end', added };
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    pos += 1;
    while (pos < len) {
      const q = text.indexOf('"', pos);
      if (q === -1) {
        // The quote never closes: it is a literal character, and the text
        // after it is read again as unquoted.
        pos = open + 1;
        line = openLine;
        error('unterminated_quote');
        return readUnquoted('"', 1);
      }
      // The segment up to the next quote: normalise CRLF and lone CR to LF
      // and count the lines it spans, only when it holds a line break.
      const seg = text.slice(pos, q);
      if (seg.indexOf('\r') !== -1 || seg.indexOf('\n') !== -1) {
        const breaks = seg.match(/\r\n|\r|\n/g);
        line += breaks.length;
        value += seg.replace(/\r\n|\r/g, '\n');
      } else {
        value += seg;
      }
      if (text.charCodeAt(q + 1) === QUOTE) {
        value += '"';
        pos = q + 2;
        continue;
      }
      pos = q + 1;
      if (pos >= len) return { value, ended: 'end' };
      const c = text.charCodeAt(pos);
      if (c === COMMA) {
        pos += 1;
        return { value, ended: 'comma' };
      }
      if (c === LF) {
        pos += 1;
        line += 1;
        return { value, ended: 'line break' };
      }
      if (c === CR && text.charCodeAt(pos + 1) === LF) {
        pos += 2;
        line += 1;
        return { value, ended: 'line break' };
      }
      // What follows the closing quote is appended as it stands, up to the
      // next comma or line break.
      const junk = readUnquoted(value, 0);
      if (junk.added > 0) error('quote_junk');
      return junk;
    }
    // The opening quote was the last character: it never closes.
    pos = open + 1;
    line = openLine;
    error('unterminated_quote');
    return readUnquoted('"', 1);
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === LF) {
        pos += 1;
        line += 1;
      } else if (c === CR && text.charCodeAt(pos + 1) === LF) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === QUOTE;
      field = quoted ? readQuoted() : readUnquoted('', 0);
      fields.push(field.value);
    } while (field.ended === 'comma');

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
