import { RxJsonSchema } from "rxdb";

const schema: RxJsonSchema = {
  title: "personal schema",
  description: "Used to assign a time to a local task, when not on dolibarr",
  version: 0,
  type: "object",
  properties: {
    id: {
      type: "string",
      primary: true
    },
    title: {
      type: "string"
    }
  },
  required: ["title"],
  indexes: ["title"]
};

export default schema;
