/**
 * Test setup — mocks packages that throw in non-Next.js contexts.
 */
import Module from 'module';

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only' || request === 'client-only') {
    return {};
  }
  return originalLoad(request, parent, isMain);
};
