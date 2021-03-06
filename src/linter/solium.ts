import * as Solium from 'solium';
import { DiagnosticSeverity, IConnection } from 'vscode-languageserver/lib/main';
import Linter from './linter';

export const defaultSoliumRules = {};

export default class SoliumService implements Linter {

    private soliumRules;
    private vsConnection: IConnection;

    constructor(soliumRules: any, vsConnection: IConnection) {
        this.vsConnection = vsConnection;
        this.setIdeRules(soliumRules);
    }

    public setIdeRules(soliumRules: any): void {
        if (!soliumRules) {
            this.soliumRules = defaultSoliumRules;
        } else {
            this.soliumRules = soliumRules;
        }
    }

    public lintAndFix(documentText) {
        return Solium.lintAndFix(documentText, this.getAllSettings());
    }

    public getAllSettings() {
        return {
            'extends': 'solium:recommended',
            'options': { 'returnInternalIssues': true },
            'plugins': ['security'],
            'rules': this.soliumRules,
        };
    }

    public validate(documentText) {
        let items = [];
        try {
            items = Solium.lint(documentText, this.getAllSettings());
        } catch (err) {
            const match = /An error .*?\nSyntaxError: (.*?) Line: (\d+), Column: (\d+)/.exec(err.message);

            if (match) {
                const line = parseInt(match[2], 10) - 1;
                const character = parseInt(match[3], 10) - 1;

                return [
                    {
                        message: `Syntax error: ${match[1]}`,
                        range: {
                            end: {
                                character,
                                line,
                            },
                            start: {
                                character,
                                line,
                            },
                        },
                        severity: DiagnosticSeverity.Error,
                    },
                ];
            } else {
                // this.vsConnection.window.showErrorMessage('solium error: ' + err);
                this.vsConnection.console.error('solium error: ' + err);
            }
        }
        return items.map(this.soliumLintResultToDiagnostic);
    }

    public soliumLintResultToDiagnostic(lintResult) {
        const severity = lintResult.type === 'warning' ?
            DiagnosticSeverity.Warning :
            DiagnosticSeverity.Error;

        const line = lintResult.line - 1;

        return {
            message: `${lintResult.ruleName}: ${lintResult.message}`,
            range: {
                end: {
                    character: lintResult.node.end,
                    line,
                },
                start: {
                    character: lintResult.column,
                    line,
                },
            },
            severity,
        };
    }
}
