import { ModErrors } from 'renderer/model/ModCollection';
import { AppConfig } from '../model/AppConfig';
import { Mod } from '../model/Mod';
declare function validateAppConfig(config: AppConfig): Promise<{
    [field: string]: string;
} | undefined>;
interface ModCollectionValidationProps {
    modList: string[];
    allMods: Map<string, Mod>;
    updateValidatedModsCallback?: (numValidatedMods: number) => void;
    setModErrorsCallback?: (errors: ModErrors) => void;
}
declare function validateActiveCollection(validationProps: ModCollectionValidationProps): Promise<unknown>;
export { validateAppConfig, validateActiveCollection };
//# sourceMappingURL=Validation.d.ts.map