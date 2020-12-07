import { RxJsonSchema } from "rxdb";

const schema: RxJsonSchema = {
  title: "project schema",
  description: "describes a Project",
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
    clientId: {
      type: "string",
      ref: "clients"
    },
    ref: {
      type: "string"
    },
    existRemote: {
      type: "integer"
    }
  },
  required: ["title"],
  indexes: ["title", "clientId"]
};

export default schema;
