import { RxJsonSchema } from "rxdb";

const schema: RxJsonSchema = {
    title: "task schema",
    description: "describes a Task",
    version: 0,
    type: "object",
    properties: {
        id: {
            type: "string",
            primary: true,
        },
        title: {
            type: "string",
        },
        description: {
            type: "string",
        },
        projectId: {
            type: "string",
            ref: "projects",
        },
        ref: {
            type: "string",
        },
        refPropal: {
            type: "string",
        },
        existRemote: {
            type: "integer",
        },
    },
    required: ["refPropal", "projectId"],
    indexes: ["refPropal", "projectId"],
};

export default schema;
