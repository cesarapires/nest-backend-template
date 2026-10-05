import { TransactionManager } from './transaction-manager.js';

type AsyncMethod = (...args: unknown[]) => Promise<unknown>;

export function Transactional(): MethodDecorator {
  return (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as AsyncMethod;

    const wrapped = function (this: unknown, ...args: unknown[]): Promise<unknown> {
      return TransactionManager.run(() => original.apply(this, args));
    };

    Object.defineProperty(wrapped, 'name', { value: original.name });

    for (const key of Reflect.getMetadataKeys(original)) {
      Reflect.defineMetadata(key, Reflect.getMetadata(key, original), wrapped);
    }

    descriptor.value = wrapped;
    return descriptor;
  };
}
