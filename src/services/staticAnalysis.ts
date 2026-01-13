import { CodebaseAnalysis, FileAnalysis } from '../types/architecture';

class StaticAnalysisService {

    analyzeFile(content: string, fileName: string): FileAnalysis {
        const analysis: FileAnalysis = {
            file: fileName,
            imports: [],
            exports: [],
            hooks: [],
            apiCalls: []
        };

        // 1. Extract Imports
        // Matches: import ... from '...' or "..."
        const importRegex = /import\s+(?:[\w.*\s{},]+)\s+from\s+['"]([^'"]+)['"]/g;
        let importMatch;
        while ((importMatch = importRegex.exec(content)) !== null) {
            analysis.imports.push(importMatch[1]);
        }

        // 2. Extract Exports
        // Matches: export const/function/class/default ...
        const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g;
        let exportMatch;
        while ((exportMatch = exportRegex.exec(content)) !== null) {
            analysis.exports.push(exportMatch[1]);
        }


        // 3. Extract Hooks (React specific)
        // Matches: useSomething(...)
        const hookRegex = /\b(use[A-Z]\w+)\(/g;
        let hookMatch;
        while ((hookMatch = hookRegex.exec(content)) !== null) {
            if (!analysis.hooks.includes(hookMatch[1])) {
                analysis.hooks.push(hookMatch[1]);
            }
        }

        // 4. Extract Potential API Calls
        // Matches: fetch(...) or axios.get/post(...)
        const fetchRegex = /fetch\(['"]([^'"]+)['"]\)/g;
        let fetchMatch;
        while ((fetchMatch = fetchRegex.exec(content)) !== null) {
            analysis.apiCalls.push(`fetch(${fetchMatch[1]})`);
        }

        return analysis;
    }

    analyzeCodebase(files: Record<string, string>): CodebaseAnalysis {
        const fileAnalyses: FileAnalysis[] = [];

        for (const [fileName, content] of Object.entries(files)) {
            if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
                fileAnalyses.push(this.analyzeFile(content, fileName));
            }
        }

        return {
            files: fileAnalyses
        };
    }
}

export const staticAnalysisService = new StaticAnalysisService();
