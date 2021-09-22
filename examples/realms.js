"use strict";

function _classPrivateMethodGet(receiver, privateSet, fn) { if (!privateSet.has(receiver)) { throw new TypeError("attempted to get private field on non-instance"); } return fn; }

function _classPrivateFieldGet(receiver, privateMap) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get"); return _classApplyDescriptorGet(receiver, descriptor); }

function _classApplyDescriptorGet(receiver, descriptor) { if (descriptor.get) { return descriptor.get.call(receiver); } return descriptor.value; }

function _classPrivateFieldSet(receiver, privateMap, value) { var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set"); _classApplyDescriptorSet(receiver, descriptor, value); return value; }

function _classExtractFieldDescriptor(receiver, privateMap, action) { if (!privateMap.has(receiver)) { throw new TypeError("attempted to " + action + " private field on non-instance"); } return privateMap.get(receiver); }

function _classApplyDescriptorSet(receiver, descriptor, value) { if (descriptor.set) { descriptor.set.call(receiver, value); } else { if (!descriptor.writable) { throw new TypeError("attempted to set read only private field"); } descriptor.value = value; } }

{
  var _iframe = new WeakMap();

  var _realm = new WeakMap();

  var _evaluateInRealm = new WeakMap();

  var _getPrimitiveOrWrappedCallable = new WeakSet();

  var _wrap = new WeakSet();

  var _isPrimitive = new WeakSet();

  var _errorCatcher = new WeakSet();

  class Realm {
    constructor() {
      _errorCatcher.add(this);

      _isPrimitive.add(this);

      _wrap.add(this);

      _getPrimitiveOrWrappedCallable.add(this);

      _realm.set(this, {
        get: _get_realm,
        set: void 0
      });

      _iframe.set(this, {
        writable: true,
        value: null
      });

      _evaluateInRealm.set(this, {
        writable: true,
        value: str => {
          const result = _classPrivateFieldGet(this, _iframe).contentWindow.eval(str);

          return _classPrivateMethodGet(this, _getPrimitiveOrWrappedCallable, _getPrimitiveOrWrappedCallable2).call(this, result);
        }
      });

      _classPrivateFieldSet(this, _iframe, document.createElement('iframe'));

      _classPrivateFieldGet(this, _iframe).setAttribute('sandbox', 'allow-same-origin allow-scripts');

      _classPrivateFieldGet(this, _iframe).style.display = 'none';

      _classPrivateFieldGet(this, _realm).attach();
    }

    evaluate(str) {
      if (typeof str !== 'string') {
        throw new TypeError('argument needs to be a string');
      }

      return _classPrivateMethodGet(this, _errorCatcher, _errorCatcher2).call(this, () => _classPrivateFieldGet(this, _evaluateInRealm).call(this, str));
    }

  }

  var _get_realm = function _get_realm() {
    const attach = () => {
      document.body.parentElement.appendChild(_classPrivateFieldGet(this, _iframe));
      return _classPrivateFieldGet(this, _iframe).contentWindow;
    };

    const detach = () => {
      _classPrivateFieldGet(this, _iframe).remove();
    };

    return {
      attach,
      detach
    };
  };

  var _getPrimitiveOrWrappedCallable2 = function _getPrimitiveOrWrappedCallable2(value) {
    if (typeof value === 'function') {
      return _classPrivateMethodGet(this, _wrap, _wrap2).call(this, value);
    }

    if (_classPrivateMethodGet(this, _isPrimitive, _isPrimitive2).call(this, value)) {
      return value;
    } // type is 'object';


    throw new TypeError('Cross-Realm Error, Evaluation result is not a primitive value');
  };

  var _wrap2 = function _wrap2(connectedFn) {
    const getPrimitiveOrWrappedCallable = _classPrivateMethodGet(this, _getPrimitiveOrWrappedCallable, _getPrimitiveOrWrappedCallable2).bind(this);

    return function (...args) {
      const wrappedArgs = args.map(getPrimitiveOrWrappedCallable);
      return getPrimitiveOrWrappedCallable(connectedFn(...wrappedArgs));
    };
  };

  var _isPrimitive2 = function _isPrimitive2(value) {
    return value == null || typeof value !== 'object';
  };

  var _errorCatcher2 = function _errorCatcher2(fn) {
    try {
      return fn();
    } catch (err) {
      if (err && typeof err === 'object') {
        throw new TypeError(`Cross-Realm Error: ${err.name}: ${err.message}`);
      } // Else


      throw new TypeError(`Cross-Realm Error: ${String(err)}`);
    }
  };

  Object.defineProperty(globalThis, 'Realm', {
    value: Realm,
    configurable: true,
    enumerable: true,
    writable: false
  });
  Object.defineProperty(Realm.prototype, 'toString', {
    value() {
      return `[object Realm]`;
    },

    configurable: false,
    enumerable: false,
    writable: false
  });
}