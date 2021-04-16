import localInit, { ConnectCallback, ProxyTarget }  from './init';

const localInitSourceText = localInit.toString();

// @ts-ignore
export class IRealm extends Realm {

    #foreignIndirectEval: (sourceText: string) => any;
    #foreignImport: (specifier: string) =>Promise<any>;
    #foreignGlobalThis: typeof globalThis;

    constructor() {
        super();
        const undefinedSymbol = Symbol();
        let localHooks: Parameters<ConnectCallback>;
        let foreignHooks: Parameters<ConnectCallback>;
        let localGetRef: () => ProxyTarget;
        let foreignExportValues: () => void;
        const localConnect = localInit(undefinedSymbol, (_exportValues, getRef, ...hooks) => {
            localGetRef = getRef;
            localHooks = hooks;
        });
        const foreignInit = super.evaluate(localInitSourceText) as (...args: Parameters<typeof localInit>) => ReturnType<typeof localInit>;
        const foreignConnect = foreignInit(undefinedSymbol, (exportValues, _getRef, ...hooks) => {
            foreignExportValues = exportValues;
            foreignHooks = hooks;
        });
        // @ts-ignore
        localConnect(...foreignHooks);
        // @ts-ignore
        foreignConnect(...localHooks);
        // @ts-ignore
        foreignExportValues();
        // @ts-ignore
        const [ foreignIndirectEval, foreignImport, foreignGlobalThis ] = localGetRef() as any;
        this.#foreignGlobalThis = foreignGlobalThis;
        this.#foreignIndirectEval = foreignIndirectEval;
        this.#foreignImport = foreignImport;
    }

    get globalThis() {
        return this.#foreignGlobalThis;
    }

    evaluate(sourceText: string) {
        if (typeof sourceText !== 'string') {
            throw new TypeError(`Invalid sourceText argument, must be a string.`);
        }
        return this.#foreignIndirectEval(sourceText);
    }

    async importValue(specifier: string, name: string): Promise<any> {
        const foreignNSObj = await this.#foreignImport(specifier);
        if (name in foreignNSObj) {
            return foreignNSObj[name];
        }
        throw new TypeError(`Invalid Binding Name`);
    }

    async import(specifier: string): Promise<any> {
        return await this.#foreignImport(specifier);
    }

}