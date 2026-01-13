
export interface ArchitectureComponent {
  id: string;
  name: string;
  type: 'service' | 'controller' | 'model' | 'view' | 'utility' | 'component' | 'context' | 'hook';
  layer: 'presentation' | 'state' | 'services' | 'data' | 'infrastructure' | 'external';
  responsibilities: string[];
}

export interface ArchitectureRelationship {
  from: string;
  to: string;
  type: 'calls' | 'depends_on' | 'imports' | 'inherits' | 'uses' | 'provides';
  description?: string;
}

export interface ArchitectureData {
  components: ArchitectureComponent[];
  relationships: ArchitectureRelationship[];
  layers: string[];
}

export interface FileAnalysis {
  file: string;
  imports: string[];
  exports: string[];
  hooks: string[];
  apiCalls: string[];
}

export interface CodebaseAnalysis {
  files: FileAnalysis[];
}
