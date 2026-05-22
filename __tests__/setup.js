/**
 * Test setup — mocks packages that throw in non-Next.js contexts.
 */
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'server-only' || request === 'client-only') {
    return {};
  }
  return originalLoad(request, parent, isMain);
};
