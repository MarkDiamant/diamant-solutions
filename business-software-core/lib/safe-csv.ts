/** RFC-4180 CSV cell with spreadsheet formula injection defence for untrusted text. */
export function safeCsvCell(value:unknown):string{
 const raw=String(value??"");
 const escaped=/^\s*[=+@-]/.test(raw)?"'"+raw:raw;
 return '"'+escaped.replace(/"/g,'""')+'"';
}
