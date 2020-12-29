import { RxJsonSchema } from "rxdb";

const schema: RxJsonSchema = {
  title: "schedule schema",
  description: "Used to assign time limit to items",
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
    duration: {
        type: "number",
        default: 0,
    },
    clientId: {
        type: "string",
        default: "",
        ref: "clients",
    },
    projectId: {
        type: "string",
        default: "",
        ref: "projects",
    },
    taskId: {
        type: "string",
        default: "",
        ref: "tasks",
    }
  },
  required: ["title"],
  indexes: ["title", "clientId", "projectId", "taskId"]
};

export default schema;
