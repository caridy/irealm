/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __spreadArray(to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
}

function init(undefinedSymbol, foreignCallableHooksCallback) {
    var cachedLocalEval = globalThis.eval;
    var defineProperty = Reflect.defineProperty, getOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor, setPrototypeOf = Reflect.setPrototypeOf, apply = Reflect.apply, construct = Reflect.construct, deleteProperty = Reflect.deleteProperty, get = Reflect.get, set = Reflect.set, has = Reflect.has, getPrototypeOf = Reflect.getPrototypeOf, isExtensible = Reflect.isExtensible, ownKeys = Reflect.ownKeys, preventExtensions = Reflect.preventExtensions;
    var freeze = Object.freeze, create = Object.create, defineProperties = Object.defineProperties;
    var isArrayOrNotOrThrowForRevoked = Array.isArray;
    var ref;
    var foreignPushTarget;
    var foreignCallableApply;
    var foreignCallableConstruct;
    var foreignCallableDefineProperty;
    var foreignCallableDeleteProperty;
    var foreignCallableGet;
    var foreignCallableGetOwnPropertyDescriptor;
    var foreignCallableGetPrototypeOf;
    var foreignCallableHas;
    var foreignCallableIsExtensible;
    var foreignCallableOwnKeys;
    var foreignCallablePreventExtensions;
    var foreignCallableSet;
    var foreignCallableSetPrototypeOf;
    function setRef(obj) {
        // assert: ref is undefined
        // assert: obj is a ProxyTarget
        ref = obj;
    }
    function getRef() {
        var r = ref;
        ref = undefined;
        return r;
    }
    function createShadowTarget(typeofTarget, protoInTarget, functionNameOfTarget, isTargetAnArray) {
        var shadowTarget;
        if (typeofTarget === 'function') {
            // this new shadow target function is never invoked just needed to anchor the realm
            try {
                shadowTarget = protoInTarget ? function () { } : function () { };
            }
            catch (_a) {
                // target is a revoked proxy
                shadowTarget = function () { };
            }
            // This is only really needed for debugging, it helps to identify the proxy by name
            defineProperty(shadowTarget, 'name', {
                value: functionNameOfTarget,
                configurable: true
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
        var desc;
        var callbackWithDescriptor = function (configurable, enumerable, writable, valuePointer, getPointer, setPointer) {
            desc = { configurable: configurable, enumerable: enumerable, writable: writable };
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
        var keys = [];
        var callbackWithKeys = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return keys = args;
        };
        foreignCallableOwnKeys(targetPointer, callbackWithKeys);
        var descriptors = create(null);
        var desc;
        var callbackWithDescriptor = function (configurable, enumerable, writable, valuePointer, getPointer, setPointer) {
            desc = { configurable: configurable, enumerable: enumerable, writable: writable };
            if (getPointer || setPointer) {
                desc.get = getLocalValue(getPointer);
                desc.set = getLocalValue(setPointer);
            }
            else {
                desc.value = getLocalValue(valuePointer);
            }
        };
        for (var i = 0, len = keys.length; i < len; i += 1) {
            var key = keys[i];
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
        var typeofNextTarget = typeof value;
        var protoInNextTarget;
        var functionNameOfNextTarget;
        var isNextTargetAnArray;
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
        return foreignPushTarget(function () { return setRef(value); }, // this is the implicit WeakMap
        typeofNextTarget, protoInNextTarget, // only for typeofTarget === 'function'
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
        var configurable = partialDesc.configurable, enumerable = partialDesc.enumerable, writable = partialDesc.writable, value = partialDesc.value, get = partialDesc.get, set = partialDesc.set;
        return {
            configurable: 'configurable' in partialDesc ? !!configurable : undefinedSymbol,
            enumerable: 'enumerable' in partialDesc ? !!enumerable : undefinedSymbol,
            writable: 'writable' in partialDesc ? !!writable : undefinedSymbol,
            valuePointer: 'value' in partialDesc ? getValueOrPointer(value) : undefinedSymbol,
            getPointer: 'get' in partialDesc ? getValueOrPointer(get) : undefinedSymbol,
            setPointer: 'set' in partialDesc ? getValueOrPointer(set) : undefinedSymbol
        };
    }
    function lockShadowTarget(shadowTarget, targetPointer) {
        copyForeignDescriptorsIntoShadowTarget(shadowTarget, targetPointer);
        var protoPointer = foreignCallableGetPrototypeOf(targetPointer);
        // setting up __proto__ of the shadowTarget
        setPrototypeOf(shadowTarget, getLocalValue(protoPointer));
        // locking down the extensibility of shadowTarget
        preventExtensions(shadowTarget);
    }
    var BoundaryProxyHandler = /** @class */ (function () {
        function BoundaryProxyHandler(targetPointer) {
            this.targetPointer = targetPointer;
            // future optimization: hoping that proxies with frozen handlers can be faster
            freeze(this);
        }
        BoundaryProxyHandler.prototype.apply = function (_shadowTarget, thisArg, args) {
            var targetPointer = this.targetPointer;
            var thisArgValueOrPointer = getValueOrPointer(thisArg);
            var listOfValuesOrPointers = args.map(getValueOrPointer);
            var foreignValueOrCallable = foreignCallableApply.apply(void 0, __spreadArray([targetPointer, thisArgValueOrPointer], listOfValuesOrPointers));
            return getLocalValue(foreignValueOrCallable);
        };
        BoundaryProxyHandler.prototype.construct = function (_shadowTarget, args, newTarget) {
            var targetPointer = this.targetPointer;
            if (newTarget === undefined) {
                throw new TypeError();
            }
            var newTargetPointer = getValueOrPointer(newTarget);
            var listOfValuesOrPointers = args.map(getValueOrPointer);
            var foreignValueOrCallable = foreignCallableConstruct.apply(void 0, __spreadArray([targetPointer, newTargetPointer], listOfValuesOrPointers));
            return getLocalValue(foreignValueOrCallable);
        };
        BoundaryProxyHandler.prototype.defineProperty = function (shadowTarget, key, partialDesc) {
            var targetPointer = this.targetPointer;
            var _a = getForeignPartialDescriptor(partialDesc), configurable = _a.configurable, enumerable = _a.enumerable, writable = _a.writable, valuePointer = _a.valuePointer, getPointer = _a.getPointer, setPointer = _a.setPointer;
            var result = foreignCallableDefineProperty(targetPointer, key, configurable, enumerable, writable, valuePointer, getPointer, setPointer);
            if (result) {
                // intentionally testing against true since it could be undefined as well
                if (configurable === false) {
                    copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
                }
            }
            return true;
        };
        BoundaryProxyHandler.prototype.deleteProperty = function (_shadowTarget, key) {
            var targetPointer = this.targetPointer;
            return foreignCallableDeleteProperty(targetPointer, key);
        };
        BoundaryProxyHandler.prototype.get = function (_shadowTarget, key, receiver) {
            var targetPointer = this.targetPointer;
            var receiverPointer = getValueOrPointer(receiver);
            var foreignValueOrCallable = foreignCallableGet(targetPointer, key, receiverPointer);
            return getLocalValue(foreignValueOrCallable);
        };
        BoundaryProxyHandler.prototype.getOwnPropertyDescriptor = function (shadowTarget, key) {
            var targetPointer = this.targetPointer;
            var desc = undefined;
            var callableDescriptorCallback = function (configurable, enumerable, writable, valuePointer, getPointer, setPointer) {
                desc = { configurable: configurable, enumerable: enumerable, writable: writable };
                if (getPointer || setPointer) {
                    desc.get = getLocalValue(getPointer);
                    desc.set = getLocalValue(setPointer);
                }
                else {
                    desc.value = getLocalValue(valuePointer);
                }
            };
            foreignCallableGetOwnPropertyDescriptor(targetPointer, key, callableDescriptorCallback);
            if (desc === undefined) {
                return desc;
            }
            if (desc.configurable === false) {
                // updating the descriptor to non-configurable on the shadow
                copyForeignDescriptorIntoShadowTarget(shadowTarget, targetPointer, key);
            }
            return desc;
        };
        BoundaryProxyHandler.prototype.getPrototypeOf = function (_shadowTarget) {
            var targetPointer = this.targetPointer;
            var protoPointer = foreignCallableGetPrototypeOf(targetPointer);
            return getLocalValue(protoPointer);
        };
        BoundaryProxyHandler.prototype.has = function (_shadowTarget, key) {
            var targetPointer = this.targetPointer;
            return foreignCallableHas(targetPointer, key);
        };
        BoundaryProxyHandler.prototype.isExtensible = function (shadowTarget) {
            // optimization to avoid attempting to lock down the shadowTarget multiple times
            if (!isExtensible(shadowTarget)) {
                return false; // was already locked down
            }
            var targetPointer = this.targetPointer;
            if (!foreignCallableIsExtensible(targetPointer)) {
                lockShadowTarget(shadowTarget, targetPointer);
                return false;
            }
            return true;
        };
        BoundaryProxyHandler.prototype.ownKeys = function (_shadowTarget) {
            var targetPointer = this.targetPointer;
            var keys = [];
            var callableKeysCallback = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return keys = args;
            };
            foreignCallableOwnKeys(targetPointer, callableKeysCallback);
            return keys;
        };
        BoundaryProxyHandler.prototype.preventExtensions = function (shadowTarget) {
            var targetPointer = this.targetPointer;
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
        };
        BoundaryProxyHandler.prototype.set = function (_shadowTarget, key, value, receiver) {
            var targetPointer = this.targetPointer;
            var valuePointer = getValueOrPointer(value);
            var receiverPointer = getValueOrPointer(receiver);
            return foreignCallableSet(targetPointer, key, valuePointer, receiverPointer);
        };
        BoundaryProxyHandler.prototype.setPrototypeOf = function (_shadowTarget, prototype) {
            var targetPointer = this.targetPointer;
            var protoValueOrPointer = getValueOrPointer(prototype);
            return foreignCallableSetPrototypeOf(targetPointer, protoValueOrPointer);
        };
        return BoundaryProxyHandler;
    }());
    setPrototypeOf(BoundaryProxyHandler.prototype, null);
    // future optimization: hoping that proxies with frozen handlers can be faster
    freeze(BoundaryProxyHandler.prototype);
    // exporting callable hooks
    foreignCallableHooksCallback(
    // exportValues
    function () {
        var pointer = getPointer([
            globalThis,
            function (sourceText) { return cachedLocalEval(sourceText); },
            function (specifier) { return import(specifier); },
        ]);
        pointer();
    }, getRef, 
    // pushTarget
    function (pointer, typeofNextTarget, protoInNextTarget, // only for typeofTarget === 'function'
    functionNameOfNextTarget, // only for typeofTarget === 'function'
    isNextTargetAnArray) {
        var shadowTarget = createShadowTarget(typeofNextTarget, protoInNextTarget, functionNameOfNextTarget, isNextTargetAnArray);
        var proxyHandler = new BoundaryProxyHandler(pointer);
        var proxy = new Proxy(shadowTarget, proxyHandler);
        return setRef.bind(undefined, proxy);
    }, 
    // callableApply
    function (targetPointer, thisArgValueOrPointer) {
        var listOfValuesOrPointers = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            listOfValuesOrPointers[_i - 2] = arguments[_i];
        }
        targetPointer();
        var fn = getRef();
        var thisArg = getLocalValue(thisArgValueOrPointer);
        var args = listOfValuesOrPointers.map(getLocalValue);
        var value = apply(fn, thisArg, args);
        return isPrimitiveValue(value) ? value : getPointer(value);
    }, 
    // callableConstruct
    function (targetPointer, newTargetPointer) {
        var listOfValuesOrPointers = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            listOfValuesOrPointers[_i - 2] = arguments[_i];
        }
        targetPointer();
        var constructor = getRef();
        var newTarget = getLocalValue(newTargetPointer);
        var args = listOfValuesOrPointers.map(getLocalValue);
        var value = construct(constructor, args, newTarget);
        return isPrimitiveValue(value) ? value : getPointer(value);
    }, 
    // callableDefineProperty
    function (targetPointer, key, configurable, enumerable, writable, valuePointer, getPointer, setPointer) {
        targetPointer();
        var target = getRef();
        var desc = create(null);
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
    function (targetPointer, key) {
        targetPointer();
        var target = getRef();
        return deleteProperty(target, key);
    }, 
    // callableGet
    function (targetPointer, key, receiverPointer) {
        targetPointer();
        var target = getRef();
        var receiver = getLocalValue(receiverPointer);
        var value = get(target, key, receiver);
        return isPrimitiveValue(value) ? value : getPointer(value);
    }, 
    // callableGetOwnPropertyDescriptor
    function (targetPointer, key, foreignCallableDescriptorCallback) {
        targetPointer();
        var target = getRef();
        var desc = getOwnPropertyDescriptor(target, key);
        if (!desc) {
            return;
        }
        var configurable = desc.configurable, enumerable = desc.enumerable, writable = desc.writable, value = desc.value, get = desc.get, set = desc.set;
        var valuePointer = getValueOrPointer(value);
        var getPointer = getValueOrPointer(get);
        var setPointer = getValueOrPointer(set);
        foreignCallableDescriptorCallback(!!configurable, !!enumerable, !!writable, valuePointer, getPointer, setPointer);
    }, 
    // callableGetPrototypeOf
    function (targetPointer) {
        targetPointer();
        var target = getRef();
        var proto = getPrototypeOf(target);
        return getValueOrPointer(proto);
    }, 
    // callableHas
    function (targetPointer, key) {
        targetPointer();
        var target = getRef();
        return has(target, key);
    }, 
    // callableIsExtensible
    function (targetPointer) {
        targetPointer();
        var target = getRef();
        return isExtensible(target);
    }, 
    // callableOwnKeys
    function (targetPointer, foreignCallableKeysCallback) {
        targetPointer();
        var target = getRef();
        var keys = ownKeys(target);
        foreignCallableKeysCallback.apply(void 0, keys);
    }, 
    // callablePreventExtensions
    function (targetPointer) {
        targetPointer();
        var target = getRef();
        return preventExtensions(target);
    }, 
    // callableSet
    function (targetPointer, key, valuePointer, receiverPointer) {
        targetPointer();
        var target = getRef();
        var value = getLocalValue(valuePointer);
        var receiver = getLocalValue(receiverPointer);
        return set(target, key, value, receiver);
    }, 
    // callableSetPrototypeOf
    function (targetPointer, protoValueOrPointer) {
        targetPointer();
        var target = getRef();
        var proto = getLocalValue(protoValueOrPointer);
        return setPrototypeOf(target, proto);
    });
    return function (pushTarget, callableApply, callableConstruct, callableDefineProperty, callableDeleteProperty, callableGet, callableGetOwnPropertyDescriptor, callableGetPrototypeOf, callableHas, callableIsExtensible, callableOwnKeys, callablePreventExtensions, callableSet, callableSetPrototypeOf) {
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

export default init;
