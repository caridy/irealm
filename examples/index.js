import localInit  from '../lib/init.js';

const { evaluate } = globalThis;

const localInitSourceText = `(${localInit.toString()})`;

// let foreignIndirectEval;
// let foreignImport;
// let foreignGlobalThis;

const undefinedSymbol = Symbol();
let localHooks;
let foreignHooks;
let localGetRef;
let foreignExportValues;
const localConnect = localInit(undefinedSymbol, (_exportValues, getRef, ...hooks) => {
    localGetRef = getRef;
    localHooks = hooks;
});
const foreignInit = evaluate(localInitSourceText);
const foreignConnect = foreignInit(undefinedSymbol, (exportValues, _getRef, ...hooks) => {
    foreignExportValues = exportValues;
    foreignHooks = hooks;
});
localConnect(...foreignHooks);
foreignConnect(...localHooks);
const exportValuesPointer = foreignExportValues();

exportValuesPointer();
const {
    globalThis: foreignGlobalThis,
    indirectEval: foreignIndirectEval,
    importModule: foreignImport,
} = localGetRef();

const r = {
    get globalThis() {
        return foreignGlobalThis;
    },
    evaluate(sourceText) {
        if (typeof sourceText !== 'string') {
            throw new TypeError(`Invalid sourceText argument, must be a string.`);
        }
        return foreignIndirectEval(sourceText);
    },
    async importValue(specifier, name) {
        const foreignNSObj = await foreignImport(specifier);
        if (name in foreignNSObj) {
            return foreignNSObj[name];
        }
        throw new TypeError(`Invalid Binding Name`);
    }
}

// Ready to execute code as r.* ...
console.log(r.globalThis.Array, r.globalThis.Array === Array);
console.log(new (r.globalThis.Array)(1, 2, 3).length);
console.log(r.globalThis.Array === r.globalThis.Array);