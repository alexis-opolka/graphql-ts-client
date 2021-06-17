import { GeneratorConfig } from "./GeneratorConfig";
export declare class Generator {
    private config;
    constructor(config: GeneratorConfig);
    generate(): Promise<void>;
    private parseSchema;
    private recreateTargetDir;
    private generateFetcherTypes;
    private generateInputTypes;
    private generateEnumTypes;
    private writeSimpleIndex;
}
