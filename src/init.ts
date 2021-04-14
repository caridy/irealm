type Pointer = CallableFunction;
type PrimitiveValue = number | symbol | string | boolean | bigint | null | undefined;
type PrimitiveOrPointer = Pointer | PrimitiveValue;
export type ProxyTarget = CallableFunction | any[] | object;
type ShadowTarget = CallableFunction | any[] | object;
type ProxyTargetType = "object" | "function" | "array";
type CallablePushTarget = (
    pointer: () => void,
    typeofNextTarget: ProxyTargetType,
    protoInNextTarget: boolean | undefined, // only for typeofTarget === 'function'
    functionNameOfNextTarget: string | undefined, // only for typeofTarget === 'function'
    isNextTargetAnArray: boolean | undefined, // only for typeofTarget !== 'function'
) => () => void;
type CallableApply = (
    targetPointer: Pointer,
    thisArgValueOrPointer: PrimitiveOrPointer,
    ...listOfValuesOrPointers: PrimitiveOrPointer[]
) => PrimitiveOrPointer;
type CallableConstruct = (
    targetPointer: Pointer,
    newTargetPointer: PrimitiveOrPointer,
    ...listOfValuesOrPointers: PrimitiveOrPointer[]
) => PrimitiveOrPointer;
type CallableDefineProperty = (
    targetPointer: Pointer,
    key: PropertyKey,
    configurable: boolean | symbol,
    enumerable: boolean | symbol,
    writable: boolean | symbol,
    valuePointer: PrimitiveOrPointer,
    getPointer: PrimitiveOrPointer,
    setPointer: PrimitiveOrPointer
) => boolean;
type CallableDeleteProperty = (
    targetPointer: Pointer,
    key: PropertyKey
) => boolean;
type CallableGet = (
    targetPointer: Pointer,
    key: PropertyKey,
    receiverPointer: PrimitiveOrPointer
) => PrimitiveOrPointer;
type CallableGetOwnPropertyDescriptor = (
    targetPointer: Pointer,
    key: PropertyKey,
    foreignCallableDescriptorCallback: (
        configurable: boolean,
        enumerable: boolean,
        writable: boolean,
        valuePointer: PrimitiveOrPointer,
        getPointer: PrimitiveOrPointer,
        setPointer: PrimitiveOrPointer
    ) => void
) => void;
type CallableGetPrototypeOf = (targetPointer: Pointer) => PrimitiveOrPointer;
type CallableHas = (targetPointer: Pointer, key: PropertyKey) => boolean;
type CallableIsExtensible = (targetPointer: Pointer) => boolean;
type CallableOwnKeys = (
    targetPointer: Pointer,
    foreignCallableKeysCallback: (...args: (string | symbol)[]) => void
) => void;
type CallablePreventExtensions = (targetPointer: Pointer) => boolean;
type CallableSet = (
    targetPointer: Pointer,
    key: PropertyKey,
    valuePointer: PrimitiveOrPointer,
    receiverPointer: PrimitiveOrPointer
) => boolean;
type CallableSetPrototypeOf = (
    targetPointer: Pointer,
    protoValueOrPointer: PrimitiveOrPointer
) => boolean;
export type ConnectCallback = (
    pushTarget: CallablePushTarget,
    callableApply: CallableApply,
    callableConstruct: CallableConstruct,
    callableDefineProperty: CallableDefineProperty,
    callableDeleteProperty: CallableDeleteProperty,
    callableGet: CallableGet,
    callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
    callableGetPrototypeOf: CallableGetPrototypeOf,
    callableHas: CallableHas,
    callableIsExtensible: CallableIsExtensible,
    callableOwnKeys: CallableOwnKeys,
    callablePreventExtensions: CallablePreventExtensions,
    callableSet: CallableSet,
    callableSetPrototypeOf: CallableSetPrototypeOf
) => void;
type HooksCallback = (
    exportValues: () => void,
    getRef: () => ProxyTarget,
    ...connectArgs: Parameters<ConnectCallback>
) => void;

export default function init(undefinedSymbol: symbol, foreignCallableHooksCallback: HooksCallback): ConnectCallback {
    const { eval: cachedLocalEval } = globalThis;
    const {
        defineProperty,
        getOwnPropertyDescriptor,
        setPrototypeOf,
        apply,
        construct,
        deleteProperty,
        get,
        set,
        has,
        getPrototypeOf,
        isExtensible,
        ownKeys,
        preventExtensions,
    } = Reflect;
    const { freeze, create, defineProperties } = Object;
    const { isArray: isArrayOrNotOrThrowForRevoked } = Array;

    let selectedTarget: undefined | ProxyTarget;
    let foreignPushTarget: CallablePushTarget;
    let foreignCallableApply: CallableApply;
    let foreignCallableConstruct: CallableConstruct;
    let foreignCallableDefineProperty: CallableDefineProperty;
    let foreignCallableDeleteProperty: CallableDeleteProperty;
    let foreignCallableGet: CallableGet;
    let foreignCallableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor;
    let foreignCallableGetPrototypeOf: CallableGetPrototypeOf;
    let foreignCallableHas: CallableHas;
    let foreignCallableIsExtensible: CallableIsExtensible;
    let foreignCallableOwnKeys: CallableOwnKeys;
    let foreignCallablePreventExtensions: CallablePreventExtensions;
    let foreignCallableSet: CallableSet;
    let foreignCallableSetPrototypeOf: CallableSetPrototypeOf;

    function selectTarget(originalTarget: ProxyTarget): void {
        // assert: selectedTarget is undefined
        // assert: originalTarget is a ProxyTarget
        selectedTarget = originalTarget;
    }

    function getSelectedTarget(): any {
        // assert: selectedTarget is a ProxyTarget
        const r = selectedTarget;
        selectedTarget = undefined;
        return r;
    }

    function createShadowTarget(
        typeofTarget: string,
        protoInTarget: boolean | undefined,
        functionNameOfTarget: string | undefined,
        isTargetAnArray: boolean | undefined,
    ): ShadowTarget {
        let shadowTarget;
        if (typeofTarget === 'function') {
            // this new shadow target function is never invoked just needed to anchor the realm
            try {
                shadowTarget = protoInTarget ? function () {} : () => {};
            } catch {
                // target is a revoked proxy
                shadowTarget = function () {};
            }
            // This is only really needed for debugging, it helps to identify the proxy by name
            defineProperty(shadowTarget, 'name', {
                value: functionNameOfTarget,
                configurable: true,
            });
        } else {
            // target is array or object
            shadowTarget = isTargetAnArray ? [] : {};
        }
        return shadowTarget;
    }

    function copyForeignDescriptorIntoShadowTarget(shadowTarget: ShadowTarget, targetPointer: Pointer, key: PropertyKey) {
        // Note: a property might get defined multiple times in the shadowTarget
        //       but it will always be compatible with the previous descriptor
        //       to preserve the object invariants, which makes these lines safe.
        let desc: PropertyDescriptor;
        const callbackWithDescriptor = (
            configurable: boolean,
            enumerable: boolean,
            writable: boolean,
            valuePointer: PrimitiveOrPointer,
            getPointer: PrimitiveOrPointer,
            setPointer: PrimitiveOrPointer
        ) => {
            desc = { configurable, enumerable, writable };
            if (getPointer || setPointer) {
                desc.get = getLocalValue(getPointer);
                desc.set = getLocalValue(setPointer);
            } else {
                desc.value = getLocalValue(valuePointer);
            }
        }
        foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
        if (desc! !== undefined) {
            defineProperty(shadowTarget, key, desc);
        }
    }

    function copyForeignDescriptorsIntoShadowTarget(shadowTarget: ShadowTarget, targetPointer: Pointer) {
        let keys: PropertyKey[] = [];
        const callbackWithKeys = (...args: PropertyKey[]) => keys = args;
        foreignCallableOwnKeys(targetPointer, callbackWithKeys);
        const descriptors = create(null);
        let desc: PropertyDescriptor;
        const callbackWithDescriptor = (
            configurable: boolean,
            enumerable: boolean,
            writable: boolean,
            valuePointer: PrimitiveOrPointer,
            getPointer: PrimitiveOrPointer,
            setPointer: PrimitiveOrPointer
        ) => {
            desc = { configurable, enumerable, writable };
            if (getPointer || setPointer) {
                desc.get = getLocalValue(getPointer);
                desc.set = getLocalValue(setPointer);
            } else {
                desc.value = getLocalValue(valuePointer);
            }
        }
        for (let i = 0, len = keys.length; i < len; i += 1) {
            const key = keys[i] as string;
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callbackWithDescriptor);
            descriptors[key] = desc!;
        }
        // Use `Object.defineProperties()` instead of individual
        // `Reflect.defineProperty()` calls for better performance.
        defineProperties(shadowTarget, descriptors);
    }

    function isPointer(primitiveValueOrForeignCallable: PrimitiveOrPointer): primitiveValueOrForeignCallable is CallableFunction {
        return typeof primitiveValueOrForeignCallable === 'function';
    }

    function isPrimitiveValue(primitiveValueOrForeignCallable: PrimitiveOrPointer): primitiveValueOrForeignCallable is PrimitiveValue {
        return typeof primitiveValueOrForeignCallable !== 'function' && typeof primitiveValueOrForeignCallable !== 'object';
    }

    function getPointer(originalTarget: ProxyTarget): Pointer {
        // extracting the metadata about the proxy target
        const typeofNextTarget = typeof originalTarget;
        let protoInNextTarget: boolean | undefined;
        let functionNameOfNextTarget: string | undefined;
        let isNextTargetAnArray: boolean | undefined;
        if (typeofNextTarget) {
            // this is never invoked just needed to anchor the realm for errors
            try {
                protoInNextTarget = 'prototype' in originalTarget;
            } catch {
                // target is either a revoked proxy, or a proxy that throws on the
                // `has` trap, in which case going with a strict mode function seems
                // appropriate.
                protoInNextTarget = true;
            }
            try {
                // a revoked proxy will throw when reading the function name
                functionNameOfNextTarget = getOwnPropertyDescriptor(originalTarget, 'name')?.value;
            } catch {
                // intentionally swallowing the error because this method is just extracting the function
                // in a way that it should always succeed except for the cases in which the provider is a proxy
                // that is either revoked or has some logic to prevent reading the name property descriptor.
            }
        } else {
            try {
                // try/catch in case Array.isArray throws when target is a revoked proxy
                isNextTargetAnArray = isArrayOrNotOrThrowForRevoked(originalTarget);
            } catch {
                // target is a revoked proxy, so the type doesn't matter much from this point on
                isNextTargetAnArray = false;
            }
        }
        const pointerForOriginalTarget = () => selectTarget(originalTarget); // the closure works as the implicit WeakMap
        return foreignPushTarget(
            pointerForOriginalTarget,
            typeofNextTarget as ProxyTargetType,
            protoInNextTarget, // only for typeofTarget === 'function'
            functionNameOfNextTarget, // only for typeofTarget === 'function'
            isNextTargetAnArray, // only for typeofTarget !== 'function'
        );
    }

    function getLocalValue(primitiveValueOrForeignCallable: PrimitiveOrPointer): any {
        if (isPointer(primitiveValueOrForeignCallable)) {
            primitiveValueOrForeignCallable();
            return getSelectedTarget();
        }
        return primitiveValueOrForeignCallable;
    }

    function getValueOrPointer(value: any): PrimitiveOrPointer {
        return isPrimitiveValue(value) ? value : getPointer(value);
    }

    function getForeignPartialDescriptor(partialDesc: PropertyDescriptor) {
        const {
            configurable,
            enumerable,
            writable,
            value,
            get,
            set,
        } = partialDesc;
        return {
            configurable: 'configurable' in partialDesc ? !!configurable : undefinedSymbol,
            enumerable: 'enumerable' in partialDesc ? !!enumerable : undefinedSymbol,
            writable: 'writable' in partialDesc ? !!writable : undefinedSymbol,
            valuePointer: 'value' in partialDesc ? getValueOrPointer(value) : undefinedSymbol,
            getPointer: 'get' in partialDesc ? getValueOrPointer(get) : undefinedSymbol,
            setPointer: 'set' in partialDesc ? getValueOrPointer(set) : undefinedSymbol,
        };
    }

    function lockShadowTarget(shadowTarget: ShadowTarget, targetPointer: Pointer) {
        copyForeignDescriptorsIntoShadowTarget(shadowTarget, targetPointer);
        const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
        // setting up __proto__ of the shadowTarget
        setPrototypeOf(shadowTarget, getLocalValue(protoPointer));
        // locking down the extensibility of shadowTarget
        preventExtensions(shadowTarget);
    }

    class BoundaryProxyHandler implements ProxyHandler<ShadowTarget> {
        // callback to prepare the foreign realm before any operation
        private readonly targetPointer: () => void;

        constructor(targetPointer: () => void) {
            this.targetPointer = targetPointer;
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
        }
        apply(_shadowTarget: ShadowTarget, thisArg: any, args: any[]): any {
            const { targetPointer } = this;
            const thisArgValueOrPointer = getValueOrPointer(thisArg);
            const listOfValuesOrPointers = args.map(getValueOrPointer);
            const foreignValueOrCallable = foreignCallableApply(targetPointer, thisArgValueOrPointer, ...listOfValuesOrPointers);
            return getLocalValue(foreignValueOrCallable);
        }
        construct(_shadowTarget: ShadowTarget, args: any[], newTarget: any): any {
            const { targetPointer } = this;
            if (newTarget === undefined) {
                throw new TypeError();
            }
            const newTargetPointer = getValueOrPointer(newTarget);
            const listOfValuesOrPointers = args.map(getValueOrPointer);
            const foreignValueOrCallable = foreignCallableConstruct(targetPointer, newTargetPointer, ...listOfValuesOrPointers);
            return getLocalValue(foreignValueOrCallable);
        }
        defineProperty(shadowTarget: ShadowTarget, key: PropertyKey, partialDesc: PropertyDescriptor): boolean {
            const { targetPointer } = this;
            const {
                configurable,
                enumerable,
                writable,
                valuePointer,
                getPointer,
                setPointer
            } = getForeignPartialDescriptor(partialDesc);
            const result = foreignCallableDefineProperty(
                targetPointer,
                key,
                configurable,
                enumerable,
                writable,
                valuePointer,
                getPointer,
                setPointer
            );
            if (result) {
                // intentionally testing against true since it could be undefined as well
                if (configurable === false) {
                    copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
                }
            }
            return true;
        }
        deleteProperty(_shadowTarget: ShadowTarget, key: PropertyKey): boolean {
            const { targetPointer } = this;
            return foreignCallableDeleteProperty(targetPointer, key);
        }
        get(_shadowTarget: ShadowTarget, key: PropertyKey, receiver: any): any {
            const { targetPointer } = this;
            const receiverPointer = getValueOrPointer(receiver);
            const foreignValueOrCallable = foreignCallableGet(targetPointer, key, receiverPointer);
            return getLocalValue(foreignValueOrCallable);
        }
        getOwnPropertyDescriptor(shadowTarget: ShadowTarget, key: PropertyKey): PropertyDescriptor | undefined {
            const { targetPointer } = this;
            let desc: PropertyDescriptor | undefined = undefined;
            const callableDescriptorCallback = (
                configurable: boolean,
                enumerable: boolean,
                writable: boolean,
                valuePointer: PrimitiveOrPointer,
                getPointer: PrimitiveOrPointer,
                setPointer: PrimitiveOrPointer
            ) => {
                desc = { configurable, enumerable, writable };
                if (getPointer || setPointer) {
                    desc.get = getLocalValue(getPointer);
                    desc.set = getLocalValue(setPointer);
                } else {
                    desc.value = getLocalValue(valuePointer);
                }
            }
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callableDescriptorCallback);
            if (desc === undefined) {
                return desc!;
            }
            if (desc!.configurable === false) {
                // updating the descriptor to non-configurable on the shadow
                copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
            }
            return desc;
        }
        getPrototypeOf(_shadowTarget: ShadowTarget): any {
            const { targetPointer } = this;
            const protoPointer = foreignCallableGetPrototypeOf(targetPointer);
            return getLocalValue(protoPointer);
        }
        has(_shadowTarget: ShadowTarget, key: PropertyKey): boolean {
            const { targetPointer } = this;
            return foreignCallableHas(targetPointer, key);
        }
        isExtensible(shadowTarget: ShadowTarget): boolean {
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
        ownKeys(_shadowTarget: ShadowTarget): ArrayLike<string | symbol> {
            const { targetPointer } = this;
            let keys: ArrayLike<string | symbol> = [];
            const callableKeysCallback = (...args: (string | symbol)[]) => keys = args;
            foreignCallableOwnKeys(targetPointer, callableKeysCallback);
            return keys;
        }
        preventExtensions(shadowTarget: ShadowTarget): boolean {
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
        set(_shadowTarget: ShadowTarget, key: PropertyKey, value: any, receiver: any): boolean {
            const { targetPointer } = this;
            const valuePointer = getValueOrPointer(value);
            const receiverPointer = getValueOrPointer(receiver);
            return foreignCallableSet(targetPointer, key, valuePointer, receiverPointer);
        }
        setPrototypeOf(_shadowTarget: ShadowTarget, prototype: any): boolean {
            const { targetPointer } = this;
            const protoValueOrPointer = getValueOrPointer(prototype);
            return foreignCallableSetPrototypeOf(targetPointer, protoValueOrPointer);
        }
    }
    setPrototypeOf(BoundaryProxyHandler.prototype, null);
    // future optimization: hoping that proxies with frozen handlers can be faster
    freeze(BoundaryProxyHandler.prototype);

    // exporting callable hooks
    foreignCallableHooksCallback(
        // exportValues
        () => {
            const pointer = getPointer([
                globalThis,
                (sourceText: string) => cachedLocalEval(sourceText),
                (specifier: string) => import(specifier),
            ]);
            pointer();
        },
        getSelectedTarget,
        // pushTarget
        (
            pointer: () => void,
            typeofNextTarget: ProxyTargetType,
            protoInNextTarget: boolean | undefined, // only for typeofTarget === 'function'
            functionNameOfNextTarget: string | undefined, // only for typeofTarget === 'function'
            isNextTargetAnArray: boolean | undefined, // only for typeofTarget !== 'function'
        ): () => void => {
            const shadowTarget = createShadowTarget(typeofNextTarget, protoInNextTarget, functionNameOfNextTarget, isNextTargetAnArray);
            const proxyHandler = new BoundaryProxyHandler(pointer);
            const proxy = new Proxy<ShadowTarget>(shadowTarget, proxyHandler as ProxyHandler<ShadowTarget>);
            return selectTarget.bind(undefined, proxy);
        },
        // callableApply
        (
            targetPointer: Pointer,
            thisArgValueOrPointer: PrimitiveOrPointer,
            ...listOfValuesOrPointers: PrimitiveOrPointer[]
        ): PrimitiveOrPointer => {
            targetPointer();
            const fn = getSelectedTarget();
            let thisArg = getLocalValue(thisArgValueOrPointer);
            let args = listOfValuesOrPointers.map(getLocalValue);
            const value = apply(fn, thisArg, args);
            return isPrimitiveValue(value) ? value : getPointer(value); 
        },
        // callableConstruct
        (
            targetPointer: Pointer,
            newTargetPointer: PrimitiveOrPointer,
            ...listOfValuesOrPointers: PrimitiveOrPointer[]
        ): PrimitiveOrPointer => {
            targetPointer();
            const constructor = getSelectedTarget();
            let newTarget = getLocalValue(newTargetPointer);
            let args = listOfValuesOrPointers.map(getLocalValue);
            const value = construct(constructor, args, newTarget);
            return isPrimitiveValue(value) ? value : getPointer(value);
        },
        // callableDefineProperty
        (
            targetPointer: Pointer,
            key: PropertyKey,
            configurable: boolean | symbol,
            enumerable: boolean | symbol,
            writable: boolean | symbol,
            valuePointer: PrimitiveOrPointer,
            getPointer: PrimitiveOrPointer,
            setPointer: PrimitiveOrPointer
        ): boolean => {
            targetPointer();
            const target = getSelectedTarget();
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
            return defineProperty(target, key, desc)
        },
        // callableDeleteProperty
        (
            targetPointer: Pointer,
            key: PropertyKey
        ): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return deleteProperty(target, key);
        },
        // callableGet
        (
            targetPointer: Pointer,
            key: PropertyKey,
            receiverPointer: PrimitiveOrPointer
        ): PrimitiveOrPointer => {
            targetPointer();
            const target = getSelectedTarget();
            const receiver = getLocalValue(receiverPointer);
            const value = get(target, key, receiver);
            return isPrimitiveValue(value) ? value : getPointer(value);
        },
        // callableGetOwnPropertyDescriptor
        (
            targetPointer: Pointer,
            key: PropertyKey,
            foreignCallableDescriptorCallback: (
                configurable: boolean,
                enumerable: boolean,
                writable: boolean,
                valuePointer: PrimitiveOrPointer,
                getPointer: PrimitiveOrPointer,
                setPointer: PrimitiveOrPointer
            ) => void
        ): void => {
            targetPointer();
            const target = getSelectedTarget();
            const desc = getOwnPropertyDescriptor(target, key);
            if (!desc) {
                return;
            }
            const {
                configurable,
                enumerable,
                writable,
                value,
                get,
                set
            } = desc;
            const valuePointer = getValueOrPointer(value);
            const getPointer = getValueOrPointer(get);
            const setPointer = getValueOrPointer(set);
            foreignCallableDescriptorCallback(!!configurable, !!enumerable, !!writable, valuePointer, getPointer, setPointer);
        },
        // callableGetPrototypeOf
        (targetPointer: Pointer): PrimitiveOrPointer => {
            targetPointer();
            const target = getSelectedTarget();
            const proto = getPrototypeOf(target);
            return getValueOrPointer(proto);
        },
        // callableHas
        (targetPointer: Pointer, key: PropertyKey): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return has(target, key);
        },
        // callableIsExtensible
        (targetPointer: Pointer): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return isExtensible(target);
        },
        // callableOwnKeys
        (
            targetPointer: Pointer,
            foreignCallableKeysCallback: (...args: (string | symbol)[]) => void
        ): void => {
            targetPointer();
            const target = getSelectedTarget();
            const keys = ownKeys(target);
            foreignCallableKeysCallback(...keys);
        },
        // callablePreventExtensions
        (targetPointer: Pointer): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            return preventExtensions(target);
        },
        // callableSet
        (
            targetPointer: Pointer,
            key: PropertyKey,
            valuePointer: PrimitiveOrPointer,
            receiverPointer: PrimitiveOrPointer
        ): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            const value = getLocalValue(valuePointer);
            const receiver = getLocalValue(receiverPointer);
            return set(target, key, value, receiver);
        },
        // callableSetPrototypeOf
        (
            targetPointer: Pointer,
            protoValueOrPointer: PrimitiveOrPointer
        ): boolean => {
            targetPointer();
            const target = getSelectedTarget();
            const proto = getLocalValue(protoValueOrPointer);
            return setPrototypeOf(target, proto);
        },
    );
    return (
        pushTarget: CallablePushTarget,
        callableApply: CallableApply,
        callableConstruct: CallableConstruct,
        callableDefineProperty: CallableDefineProperty,
        callableDeleteProperty: CallableDeleteProperty,
        callableGet: CallableGet,
        callableGetOwnPropertyDescriptor: CallableGetOwnPropertyDescriptor,
        callableGetPrototypeOf: CallableGetPrototypeOf,
        callableHas: CallableHas,
        callableIsExtensible: CallableIsExtensible,
        callableOwnKeys: CallableOwnKeys,
        callablePreventExtensions: CallablePreventExtensions,
        callableSet: CallableSet,
        callableSetPrototypeOf: CallableSetPrototypeOf
    ) => {
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
};
