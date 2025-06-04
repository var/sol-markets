import * as fs from 'fs';
import * as path from 'path';
import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';

// Cache for loaded documents
const documentCache = new Map<string, DocumentNode>();

/**
 * Load a GraphQL document from a .graphql file
 */
export function loadGraphQLDocument(filePath: string): DocumentNode {
  // Convert relative path to absolute
  const absolutePath = path.resolve(filePath);
  
  // Check cache first
  if (documentCache.has(absolutePath)) {
    return documentCache.get(absolutePath)!;
  }
  
  // Read and parse the file
  const source = fs.readFileSync(absolutePath, 'utf8');
  const document = gql(source);
  
  // Cache the result
  documentCache.set(absolutePath, document);
  
  return document;
}

/**
 * Register require hook for .graphql and .gql files
 * This enables importing .graphql files directly
 */
export function registerGraphQLLoader(): void {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id: string) {
    if (id.endsWith('.graphql') || id.endsWith('.gql')) {
      // Handle relative paths
      const filename = Module._resolveFilename(id, this);
      return loadGraphQLDocument(filename);
    }
    return originalRequire.apply(this, arguments);
  };
} 