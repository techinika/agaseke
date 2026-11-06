import type { Env } from "../types";
import {
  convertFromFields,
  convertToFields,
  firestoreGet,
  firestoreQuery,
} from "../firestore";
import type { PaymentRepository } from "./pricing";

export function createPaymentRepository(env: Env): PaymentRepository {
  return {
    async get(path: string): Promise<Record<string, unknown> | null> {
      const doc = await firestoreGet(env, path);
      if (!doc || !doc.fields) return null;
      return convertFromFields(doc.fields as Record<string, unknown>);
    },

    async query(
      collection: string,
      field: string,
      value: unknown,
      limit = 1,
    ): Promise<Record<string, unknown>[]> {
      const encoded = convertToFields({ value }).value as Record<string, unknown>;
      const docs = await firestoreQuery(env, collection, field, encoded, limit);
      return docs.map((doc) =>
        convertFromFields(doc.fields as Record<string, unknown>),
      );
    },
  };
}
