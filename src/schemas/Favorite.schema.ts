import { RxJsonSchema } from "rxdb";

const schema: RxJsonSchema = {
  title: "favorite schema",
  description: "Used to assign favorite to tasks",
  version: 0,
  type: "object",
  properties: {
    title: {
      type: "string"
    },
    position: { //Used for shortcut, between 1-9
      type: "integer",
    },
    taskId: {
        type: "string",
        default: "",
        ref: "tasks",
    }
  },
  required: ["position"],
  indexes: ["position"]
};

export default schema;
