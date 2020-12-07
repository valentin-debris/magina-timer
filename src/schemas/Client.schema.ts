import { RxJsonSchema } from "rxdb";

const schema: RxJsonSchema = {
  title: "client schema",
  description: "describes a Client",
  version: 0,
  type: "object",
  properties: {
    id: {
      type: "string",
      primary: true
    },
    title: {
      type: "string"
    },
    existRemote: {
      type: "integer"
    }
  },
  required: ["title"],
  indexes: ["title"]
};

export default schema;
