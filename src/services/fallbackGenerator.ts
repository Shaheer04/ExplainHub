export const generateLocalArchitecture = (repoStructure: any): string => {
    // Simple heuristic: Convert folder structure to flowchart
    // This ensures the user sees SOMETHING even if AI fails.

    let mermaid = 'graph TD\n';
    mermaid += '    classDef default fill:#1f2937,stroke:#3b82f6,stroke-width:2px,color:#fff;\n';
    mermaid += '    classDef status fill:#374151,stroke:#6b7280,stroke-dasharray: 5 5;\n'; // Status style

    // Add Watermark
    mermaid += '    subgraph Status ["Metadata"]\n';
    mermaid += '        direction TB\n';
    mermaid += '        fallback["⚠️ Offline Mode"]:::status\n';
    mermaid += '    end\n';

    mermaid += '    root["Repository Root"]\n';

    const MAX_DEPTH = 1; // Limit depth for fallback to keep it clean (just top folders)
    const MAX_NODES = 15;
    let nodeCount = 0;

    const traverse = (node: any, parentId: string, depth: number) => {
        if (depth > MAX_DEPTH || nodeCount > MAX_NODES) return;

        // Only show folders and VERY important files
        const relevantChildren = (node.children || []).filter((child: any) => {
            const isDir = child.type === 'dir' && !['node_modules', '.git', 'dist'].includes(child.name);
            const isImportantFile = ['package.json', 'README.md', 'Dockerfile', 'compose.yml'].includes(child.name);
            return isDir || isImportantFile;
        });

        relevantChildren.forEach((child: any) => {
            if (nodeCount > MAX_NODES) return;

            const childId = `node_${nodeCount++}`;
            const label = child.name;

            mermaid += `    ${parentId} --> ${childId}["${label}"]\n`;

            if (child.type === 'dir') {
                traverse(child, childId, depth + 1);
            }
        });
    };

    traverse(repoStructure, 'root', 0);

    return mermaid;
};
