import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: 'fetch',
  input: 'https://raw.githubusercontent.com/rezkam/mono/main/api/openapi/mono.yaml',
  output: {
    format: 'prettier',
    path: './src/generated',
  },
  types: {
    enums: 'javascript',
  },
});
