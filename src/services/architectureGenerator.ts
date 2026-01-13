import { ArchitectureData, CodebaseAnalysis } from '../types/architecture';
import { extractArchitectureData } from './geminiApi';

class ArchitectureGeneratorService {

    async generateDiagram(
        repoName: string,
        repoStructure: any,
        analysis: CodebaseAnalysis,
        apiKey: string
    ): Promise<string> {

        // Phase 1: Get Structured Data from Gemini
        console.log('Phase 1: Extracting Architecture Data...');
        const architectureData = await extractArchitectureData(repoName, repoStructure, analysis, apiKey);

        // Phase 2: Convert to Mermaid
        console.log('Phase 2: Converting to Mermaid...');
        return this.convertJsonToMermaid(architectureData);
    }

    convertJsonToMermaid(data: ArchitectureData): string {
        const { components, relationships, layers } = data;

        let mermaid = 'graph TD\n';

        // Helper to sanitize IDs and Labels
        const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_]/g, '_');
        const quote = (str: string) => `"${str.replace(/"/g, "'")}"`;

        // 1. Define Layers (Subgraphs)
        // We group components by their layer property.
        // Use the provided layers list to order them or just iterate unique layers found.

        const validLayers = layers || Array.from(new Set(components.map(c => c.layer)));

        validLayers.forEach(layerName => {
            const layerId = sanitize(layerName);
            mermaid += `    subgraph ${layerId} [${quote(layerName)}]\n`;

            // Find components in this layer
            // Note: Component layer value might not match exact casing of layer definition, enforce normalization if needed.
            // For now assume AI provides matching strings.
            const layerComponents = components.filter(c =>
                c.layer?.toLowerCase() === layerName.toLowerCase() ||
                (!c.layer && layerName === 'Other')
            );

            layerComponents.forEach(comp => {
                const compId = sanitize(comp.id);
                const compLabel = quote(comp.name);
                // Add styling based on type? Optional.
                mermaid += `        ${compId}[${compLabel}]\n`;
            });

            mermaid += `    end\n`;
        });

        // 2. Add Relationships
        relationships.forEach(rel => {
            const fromId = sanitize(rel.from);
            const toId = sanitize(rel.to);
            const label = rel.description ? `|${quote(rel.description)}|` : '';

            let arrow = '-->'; // default depends_on/calls
            if (rel.type === 'imports' || rel.type === 'uses') arrow = '-.->';
            if (rel.type === 'inherits') arrow = '--|inherits|-->'; // or specific style

            // Only add if source and target exist to avoid graph errors (or rely on Mermaid to handle implicit nodes)
            // Determining existence:
            // const exists = components.some(c => sanitize(c.id) === fromId) && components.some(c => sanitize(c.id) === toId);
            // But purely string based check is faster and safer if we trust the IDs match.

            mermaid += `    ${fromId} ${arrow} ${label} ${toId}\n`;
        });

        // 3. Styling
        mermaid += '\n    classDef default fill:#1f2937,stroke:#3b82f6,stroke-width:2px,color:#fff;\n';

        // 4. Add AI Status Indicator (as per original requirements)
        mermaid += `    subgraph Status [ ]\n        style Status fill:transparent,stroke:none\n        direction LR\n        AI_GEN["✨ AI Generated Architecture"]:::status\n    end\n`;
        mermaid += `    classDef status fill:#10b981,stroke:#059669,color:white;\n`;

        return mermaid;
    }
}

export const architectureGenerator = new ArchitectureGeneratorService();
