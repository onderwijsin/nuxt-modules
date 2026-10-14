import { z } from "zod";
import {
  isArray,
  isBoolean,
  isFiniteNumber,
  isRecord,
  isString
} from "@onderwijsin/nuxt-module-utils/shared";

/** Validates JSON data without invoking getters, coercion or custom serialization. */
export const frontmatterSchema = z
  .custom<Record<string, unknown>>(isRecord)
  .superRefine((value, ctx) => {
    const ancestors = new Set<object>();
    const inspect = (current: unknown, path: (string | number)[]): void => {
      const reject = (message: string) => ctx.addIssue({ code: "custom", path, message });
      if (current === null || isString(current) || isBoolean(current) || isFiniteNumber(current))
        return;
      if (!isArray(current) && !isRecord(current)) {
        reject("Expected a JSON value.");
        return;
      }
      const array = isArray(current);
      const prototype = Object.getPrototypeOf(current);
      const plainPrototype = array
        ? prototype === Array.prototype
        : prototype === Object.prototype || prototype === null;
      if (!plainPrototype) {
        reject("Expected a plain object, not a class instance.");
        return;
      }
      if (ancestors.has(current)) {
        reject("Circular references are unsupported.");
        return;
      }
      ancestors.add(current);
      if (array) {
        for (let index = 0; index < current.length; index++) {
          if (!Object.hasOwn(current, index)) {
            ctx.addIssue({
              code: "custom",
              path: [...path, index],
              message: "Sparse arrays are unsupported."
            });
          }
        }
      }
      for (const key of Reflect.ownKeys(current)) {
        if (array && key === "length") continue;
        if (!isString(key)) {
          reject("Symbol keys are unsupported.");
          continue;
        }
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) {
          ctx.addIssue({
            code: "custom",
            path: [...path, key],
            message: "Accessors are unsupported."
          });
          continue;
        }
        if (!descriptor.enumerable || (array && !/^(?:0|[1-9][0-9]*)$/u.test(key))) {
          ctx.addIssue({
            code: "custom",
            path: [...path, key],
            message: "Expected an enumerable JSON property."
          });
          continue;
        }
        inspect(descriptor.value, [...path, key]);
      }
      ancestors.delete(current);
    };
    inspect(value, []);
  });
