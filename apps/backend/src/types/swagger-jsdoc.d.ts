/**
 * Minimal ambient types for `swagger-jsdoc`, which doesn't ship its own.
 * We only use the default function and the options type, so this is enough.
 */
declare module 'swagger-jsdoc' {
  export interface SwaggerJsdocOptions {
    definition: Record<string, unknown> | ((options: unknown) => Record<string, unknown>);
    apis: string[];
  }
  function swaggerJsdoc(options: SwaggerJsdocOptions): Record<string, unknown>;
  export default swaggerJsdoc;
}
