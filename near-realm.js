var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _foreignIndirectEval, _foreignImport, _foreignGlobalThis;
function localInit(undefinedSymbol, callback) {
    const { eval: cachedLocalEval } = globalThis;
    const { defineProperty, getOwnPropertyDescriptor, setPrototypeOf, apply, construct, deleteProperty, get, set, has, getPrototypeOf, isExtensible, ownKeys, preventExtensions, } = Reflect;
    const { freeze, create, defineProperties } = Object;
    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;
    let ref;
    let foreignPushTarget;
    let foreignCallableApply;
    let foreignCallableConstruct;
    let foreignCallableDefineProperty;
    let foreignCallableDeleteProperty;
    let foreignCallableGet;
    let foreignCallableGetOwnPropertyDescriptor;
    let foreignCallableGetPrototypeOf;
    let foreignCallableHas;
    let foreignCallableIsExtensible;
    let foreignCallableOwnKeys;
    let foreignCallablePreventExtensions;
    let foreignCallableSet;
    let foreignCallableSetPrototypeOf;
    function setRef(obj) {
        // assert: ref is undefined
        // assert: obj is a ProxyTarget
        ref = obj;
    }
    function getRef() {
        const r = ref;
        ref = undefined;
        return r;
    }
    function createShadowTarget(typeofTarget, protoInTarget, functionNameOfTarget, isTargetAnArray) {
        let shadowTarget;
        if (typeofTarget === 'function') {
            // this new shadow target function is never invoked just needed to anchor the realm
            try {
                shadowTarget = protoInTarget ? function () { } : () => { };
            }
            catch (_a) {
                // target is a revoked proxy
                shadowTarget = function () { };
            }
            // This is only really needed for debugging, it helps to identify the proxy by name
            defineProperty(shadowTarget, 'name', {
                value: functionNameOfTarget,
                configurable: true,
            });
        }
        else {
            // target is array or object
            shadowTarget = isTargetAnArray ? [] : {};
        }
        return shadowTarget;
    }
    function copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key) {
        // Note: a property might get defined multiple times in the shadowTarget
        //       but it will always be compatible with the previous descriptor
        //       to preserve the object invariants, which makes these lines safe.
        let desc;
        const callbackWithDescriptor = (configurable, enumerable, writable, valuePointer, getPointer, setPointer) => {
            desc = { configurable, enumerable, writable };
            if (getPointer || setPointer) {
                desc.get = getLocalValue(getPointer);
                desc.set = getLocalValue(setPointer);
            }
            else {
                desc.value = getLocalValue(valuePointer);
            }
        };
        foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
        if (desc !== undefined) {
            defineProperty(shadowTarget, key, desc);
        }
    }
    function copyForeignDescriptorsIntoShadowTarget(shadowTarget, targetPointer) {
        let keys = [];
        const callbackWithKeys = (...args) => keys = args;
        foreignCallableOwnKeys(targetPointer, callbackWithKeys);
        const descriptors = create(null);
        let desc;
        const callbackWithDescriptor = (configurable, enumerable, writable, valuePointer, getPointer, setPointer) => {
            desc = { configurable, enumerable, writable };
            if (getPointer || setPointer) {
                desc.get = getLocalValue(getPointer);
                desc.set = getLocalValue(setPointer);
            }
            else {
                desc.value = getLocalValue(valuePointer);
            }
        };
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i];
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
            descriptors[key] = desc;
        }
        // Use `Object.defineProperties()` instead of individual
        // `Reflect.defineProperty()` calls for better performance.
        defineProperties(shadowTarget, descriptors);
    }
    function isPointer(primitiveValueOrForeignCallable) {
        return typeof primitiveValueOrForeignCallable === 'function';
    }
    function isPrimitiveValue(primitiveValueOrForeignCallable) {
        return typeof primitiveValueOrForeignCallable !== 'function' && typeof primitiveValueOrForeignCallable !== 'object';
    }
    function getPointer(value) {
        var _a;
        // extracting the metadata about the proxy target
        const typeofNextTarget = typeof value;
        let protoInNextTarget;
        let functionNameOfNextTarget;
        let isNextTargetAnArray;
        if (typeofNextTarget) {
            // this is never invoked just needed to anchor the realm for errors
            try {
                protoInNextTarget = 'prototype' in value;
            }
            catch (_b) {
                // target is either a revoked proxy, or a proxy that throws on the
                // `has` trap, in which case going with a strict mode function seems
                // appropriate.
                protoInNextTarget = true;
            }
            try {
                // a revoked proxy will throw when reading the function name
                functionNameOfNextTarget = (_a = getOwnPropertyDescriptor(value, 'name')) === null || _a === void 0 ? void 0 : _a.value;
            }
            catch (_c) {
                // intentionally swallowing the error because this method is just extracting the function
                // in a way that it should always succeed except for the cases in which the provider is a proxy
                // that is either revoked or has some logic to prevent reading the name property descriptor.
            }
        }
        else {
            try {
                // try/catch in case Array.isArray throws when target is a revoked proxy
                isNextTargetAnArray = isArrayOrNotOrThrowForRevoked(value);
            }
            catch (_d) {
                // target is a revoked proxy, so the type doesn't matter much from this point on
                isNextTargetAnArray = false;
            }
        }
        return foreignPushTarget(() => setRef(value), typeofNextTarget, protoInNextTarget, // only for typeofTarget === 'function'
        functionNameOfNextTarget, // only for typeofTarget === 'function'
        isNextTargetAnArray);
    }
    function getLocalValue(primitiveValueOrForeignCallable) {
        if (isPointer(primitiveValueOrForeignCallable)) {
            primitiveValueOrForeignCallable();
            return getRef();
        }
        return primitiveValueOrForeignCallable;
    }
    function getValueOrPointer(value) {
        return isPrimitiveValue(value) ? value : getPointer(value);
    }
    function getForeignPartialDescriptor(partialDesc) {
        const { configurable, enumerable, writable, value, get, set, } = partialDesc;
        return {
            configurable: 'configurable' in partialDesc ? !!configurable : undefinedSymbol,
            enumerable: 'enumerable' in partialDesc ? !!enumerable : undefinedSymbol,
            writable: 'writable' in partialDesc ? !!writable : undefinedSymbol,
            valuePointer: 'value' in partialDesc ? getValueOrPointer(value) : undefinedSymbol,
            getPointer: 'get' in partialDesc ? getValueOrPointer(get) : undefinedSymbol,
            setPointer: 'set' in partialDesc ? getValueOrPointer(set) : undefinedSymbol,
        };
    }
    function lockShadowTarget(shadowTarget, targetPointer) {
        copyForeignDescriptorsIntoShadowTarget(shadowTarget, targetPointer);
        const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
        // setting up __proto__ of the shadowTarget
        setPrototypeOf(shadowTarget, getLocalValue(protoPointer));
        // locking down the extensibility of shadowTarget
        preventExtensions(shadowTarget);
    }
    class BoundaryProxyHandler {
        constructor(targetPointer) {
            this.targetPointer = targetPointer;
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
        }
        apply(_shadowTarget, thisArg, args) {
            const { targetPointer } = this;
            const thisArgValueOrPointer = getValueOrPointer(thisArg);
            const listOfValuesOrPointers = args.map(getValueOrPointer);
            const foreignValueOrCallable = foreignCallableApply(targetPointer, thisArgValueOrPointer, ...listOfValuesOrPointers);
            return getLocalValue(foreignValueOrCallable);
        }
        construct(_shadowTarget, args, newTarget) {
            const { targetPointer } = this;
            if (newTarget === undefined) {
                throw new TypeError();
            }
            const newTargetPointer = getValueOrPointer(newTarget);
            const listOfValuesOrPointers = args.map(getValueOrPointer);
            const foreignValueOrCallable = foreignCallableConstruct(targetPointer, newTargetPointer, ...listOfValuesOrPointers);
            return getLocalValue(foreignValueOrCallable);
        }
        defineProperty(shadowTarget, key, partialDesc) {
            const { targetPointer } = this;
            const { configurable, enumerable, writable, valuePointer, getPointer, setPointer } = getForeignPartialDescriptor(partialDesc);
            const result = foreignCallableDefineProperty(targetPointer, key, configurable, enumerable, writable, valuePointer, getPointer, setPointer);
            if (result) {
                // intentionally testing against true since it could be undefined as well
                if (configurable === false) {
                    copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
                }
            }
            return true;
        }
        deleteProperty(_shadowTarget, key) {
            const { targetPointer } = this;
            return foreignCallableDeleteProperty(targetPointer, key);
        }
        get(_shadowTarget, key, receiver) {
            const { targetPointer } = this;
            const receiverPointer = getValueOrPointer(receiver);
            const foreignValueOrCallable = foreignCallableGet(targetPointer, key, receiverPointer);
            return getLocalValue(foreignValueOrCallable);
        }
        getOwnPropertyDescriptor(shadowTarget, key) {
            const { targetPointer } = this;
            let desc = undefined;
            const callback = (configurable, enumerable, writable, valuePointer, getPointer, setPointer) => {
                desc = { configurable, enumerable, writable };
                if (getPointer || setPointer) {
                    desc.get = getLocalValue(getPointer);
                    desc.set = getLocalValue(setPointer);
                }
                else {
                    desc.value = getLocalValue(valuePointer);
                }
            };
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callback);
            if (desc === undefined) {
                return desc;
            }
            if (desc.configurable === false) {
                // updating the descriptor to non-configurable on the shadow
                copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
            }
            return desc;
        }
        getPrototypeOf(_shadowTarget) {
            const { targetPointer } = this;
            const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
            return getLocalValue(protoPointer);
        }
        has(_shadowTarget, key) {
            const { targetPointer } = this;
            return foreignCallableHas(targetPointer, key);
        }
        isExtensible(shadowTarget) {
            // optimization to avoid attempting to lock down the shadowTarget multiple times
            if (!isExtensible(shadowTarget)) {
                return false; // was already locked down
            }
            const { targetPointer } = this;
            if (!foreignCallableIsExtensible(targetPointer)) {
                lockShadowTarget(shadowTarget, targetPointer);
                return false;
            }
            return true;
        }
        ownKeys(_shadowTarget) {
            const { targetPointer } = this;
            let keys = [];
            const callback = (...args) => keys = args;
            foreignCallableOwnKeys(targetPointer, callback);
            return keys;
        }
        preventExtensions(shadowTarget) {
            const { targetPointer } = this;
            if (isExtensible(shadowTarget)) {
                if (!foreignCallablePreventExtensions(targetPointer)) {
                    // if the target is a proxy manually created, it might reject
                    // the preventExtension call, in which case we should not attempt to lock down
                    // the shadow target.
                    if (!foreignCallableIsExtensible(targetPointer)) {
                        lockShadowTarget(shadowTarget, targetPointer);
                    }
                    return false;
                }
                lockShadowTarget(shadowTarget, targetPointer);
            }
            return true;
        }
        set(_shadowTarget, key, value, receiver) {
            const { targetPointer } = this;
            const valuePointer = getValueOrPointer(value);
            const receiverPointer = getValueOrPointer(receiver);
            return foreignCallableSet(targetPointer, key, valuePointer, receiverPointer);
        }
        setPrototypeOf(_shadowTarget, prototype) {
            const { targetPointer } = this;
            const protoValueOrPointer = getValueOrPointer(prototype);
            return foreignCallableSetPrototypeOf(targetPointer, protoValueOrPointer);
        }
    }
    setPrototypeOf(BoundaryProxyHandler.prototype, null);
    // future optimization: hoping that proxies with frozen handlers can be faster
    freeze(BoundaryProxyHandler.prototype);
    // exporting callable hooks
    callback(
    // exportValues
    () => {
        getPointer([
            globalThis,
            (sourceText) => cachedLocalEval(sourceText),
            (specifier) => import(specifier),
        ]);
    }, getRef, 
    // pushTarget
    (pointer, typeofNextTarget, protoInNextTarget, // only for typeofTarget === 'function'
    functionNameOfNextTarget, // only for typeofTarget === 'function'
    isNextTargetAnArray) => {
        const shadowTarget = createShadowTarget(typeofNextTarget, protoInNextTarget, functionNameOfNextTarget, isNextTargetAnArray);
        const proxyHandler = new BoundaryProxyHandler(pointer);
        const proxy = new Proxy(shadowTarget, proxyHandler);
        return setRef.bind(undefined, proxy);
    }, 
    // callableApply
    (targetPointer, thisArgValueOrPointer, ...listOfValuesOrPointers) => {
        targetPointer();
        const fn = getRef();
        let thisArg = getLocalValue(thisArgValueOrPointer);
        let args = listOfValuesOrPointers.map(getLocalValue);
        const value = apply(fn, thisArg, args);
        return isPrimitiveValue(value) ? value : getPointer(value);
    }, 
    // callableConstruct
    (targetPointer, newTargetPointer, ...listOfValuesOrPointers) => {
        targetPointer();
        const constructor = getRef();
        let newTarget = getLocalValue(newTargetPointer);
        let args = listOfValuesOrPointers.map(getLocalValue);
        const value = construct(constructor, args, newTarget);
        return isPrimitiveValue(value) ? value : getPointer(value);
    }, 
    // callableDefineProperty
    (targetPointer, key, configurable, enumerable, writable, valuePointer, getPointer, setPointer) => {
        targetPointer();
        const target = getRef();
        const desc = create(null);
        if (configurable !== undefinedSymbol) {
            desc.configurable = configurable;
        }
        if (enumerable !== undefinedSymbol) {
            desc.enumerable = enumerable;
        }
        if (writable !== undefinedSymbol) {
            desc.writable = writable;
        }
        if (getPointer !== undefinedSymbol) {
            desc.get = getLocalValue(getPointer);
        }
        if (setPointer !== undefinedSymbol) {
            desc.set = getLocalValue(setPointer);
        }
        if (valuePointer !== undefinedSymbol) {
            desc.value = getLocalValue(valuePointer);
        }
        return defineProperty(target, key, desc);
    }, 
    // callableDeleteProperty
    (targetPointer, key) => {
        targetPointer();
        const target = getRef();
        return deleteProperty(target, key);
    }, 
    // callableGet
    (targetPointer, key, receiverPointer) => {
        targetPointer();
        const target = getRef();
        const receiver = getLocalValue(receiverPointer);
        const value = get(target, key, receiver);
        return isPrimitiveValue(value) ? value : getPointer(value);
    }, 
    // callableGetOwnPropertyDescriptor
    (targetPointer, key, callback) => {
        targetPointer();
        const target = getRef();
        const desc = getOwnPropertyDescriptor(target, key);
        if (!desc) {
            return;
        }
        const { configurable, enumerable, writable, value, get, set } = desc;
        const valuePointer = getValueOrPointer(value);
        const getPointer = getValueOrPointer(get);
        const setPointer = getValueOrPointer(set);
        callback(!!configurable, !!enumerable, !!writable, valuePointer, getPointer, setPointer);
    }, 
    // callableGetPrototypeOf
    (targetPointer) => {
        targetPointer();
        const target = getRef();
        const proto = getPrototypeOf(target);
        return getValueOrPointer(proto);
    }, 
    // callableHas
    (targetPointer, key) => {
        targetPointer();
        const target = getRef();
        return has(target, key);
    }, 
    // callableIsExtensible
    (targetPointer) => {
        targetPointer();
        const target = getRef();
        return isExtensible(target);
    }, 
    // callableOwnKeys
    (targetPointer, callback) => {
        targetPointer();
        const target = getRef();
        const keys = ownKeys(target);
        callback(...keys);
    }, 
    // callablePreventExtensions
    (targetPointer) => {
        targetPointer();
        const target = getRef();
        return preventExtensions(target);
    }, 
    // callableSet
    (targetPointer, key, valuePointer, receiverPointer) => {
        targetPointer();
        const target = getRef();
        const value = getLocalValue(valuePointer);
        const receiver = getLocalValue(receiverPointer);
        return set(target, key, value, receiver);
    }, 
    // callableSetPrototypeOf
    (targetPointer, protoValueOrPointer) => {
        targetPointer();
        const target = getRef();
        const proto = getLocalValue(protoValueOrPointer);
        return setPrototypeOf(target, proto);
    });
    return (pushTarget, callableApply, callableConstruct, callableDefineProperty, callableDeleteProperty, callableGet, callableGetOwnPropertyDescriptor, callableGetPrototypeOf, callableHas, callableIsExtensible, callableOwnKeys, callablePreventExtensions, callableSet, callableSetPrototypeOf) => {
        foreignPushTarget = pushTarget;
        foreignCallableApply = callableApply;
        foreignCallableConstruct = callableConstruct;
        foreignCallableDefineProperty = callableDefineProperty;
        foreignCallableDeleteProperty = callableDeleteProperty;
        foreignCallableGet = callableGet;
        foreignCallableGetOwnPropertyDescriptor = callableGetOwnPropertyDescriptor;
        foreignCallableGetPrototypeOf = callableGetPrototypeOf;
        foreignCallableHas = callableHas;
        foreignCallableIsExtensible = callableIsExtensible;
        foreignCallableOwnKeys = callableOwnKeys;
        foreignCallablePreventExtensions = callablePreventExtensions;
        foreignCallableSet = callableSet;
        foreignCallableSetPrototypeOf = callableSetPrototypeOf;
    };
}
;
const localInitSourceText = localInit.toString();
// @ts-ignore
export class NearRealm extends Realm {
    constructor() {
        super();
        _foreignIndirectEval.set(this, void 0);
        _foreignImport.set(this, void 0);
        _foreignGlobalThis.set(this, void 0);
        const undefinedSymbol = Symbol();
        let localHooks;
        let foreignHooks;
        let localGetRef;
        let foreignExportValues;
        const localConnect = localInit(undefinedSymbol, (_exportValues, getRef, ...hooks) => {
            localGetRef = getRef;
            localHooks = hooks;
        });
        const foreignInit = super.evaluate(localInitSourceText);
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
        const [foreignIndirectEval, foreignImport, foreignGlobalThis] = localGetRef();
        __classPrivateFieldSet(this, _foreignGlobalThis, foreignGlobalThis);
        __classPrivateFieldSet(this, _foreignIndirectEval, foreignIndirectEval);
        __classPrivateFieldSet(this, _foreignImport, foreignImport);
    }
    get globalThis() {
        return __classPrivateFieldGet(this, _foreignGlobalThis);
    }
    evaluate(sourceText) {
        if (typeof sourceText !== 'string') {
            throw new TypeError(`Invalid sourceText argument, must be a string.`);
        }
        return __classPrivateFieldGet(this, _foreignIndirectEval).call(this, sourceText);
    }
    async importValue(specifier, name) {
        const foreignNSObj = await __classPrivateFieldGet(this, _foreignImport).call(this, specifier);
        if (name in foreignNSObj) {
            return foreignNSObj[name];
        }
        throw new TypeError(`Invalid Binding Name`);
    }
}