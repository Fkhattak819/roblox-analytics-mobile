'use strict';

// query-string 7 expects a callable CommonJS export. Node 22.18 and Metro
// expose the upstream ESM default through this namespace without duplicating
// or modifying the patched decoder algorithm.
const decode = require('decode-uri-component-patched').default;

module.exports = function decodeUriComponentCompat(value) {
  // Preserve the legacy decoder's plus-to-space behavior for existing callers.
  return decode(typeof value === 'string' ? value.replace(/\+/g, ' ') : value);
};
