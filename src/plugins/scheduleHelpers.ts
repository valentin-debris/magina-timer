import DatabaseService from "./database";
import { RxScheduleDocument } from "@/RxDB";

/**
 * the dates are for 0AM, so check betwen first day of month and first day of next month
 */
async function foundTotalTimes(
    dayStart: Date,
    dayEnd: Date,
    item: RxScheduleDocument
): Promise<number> {
    const db = await DatabaseService.get();

    const taskIds = [];
    if (item.taskId) {
        taskIds.push(item.taskId);
    } else if (item.projectId) {
        const tasks = await db.tasks
            .find({
                selector: {
                    projectId: item.projectId,
                },
            })
            .exec();
        tasks.map((i) => {
            taskIds.push(i.id);
        });
    } else if (item.clientId) {
        const projects = await db.projects
            .find({
                selector: {
                    clientId: item.clientId,
                },
            })
            .exec();

        const projectIds: string[] = [];
        projects.map((i) => {
            projectIds.push(i.id + "");
        });

        const tasks = await db.tasks
            .find({
                selector: {
                    projectId: { $in: projectIds },
                },
            })
            .exec();

        tasks.map((i) => {
            taskIds.push(i.id);
        });
    }

    const items = await db.times
        .find({
            selector: {
                $and: [
                    {
                        start: {
                            $gte: Math.trunc(dayStart.getTime() / 1000),
                        },
                    },
                    {
                        start: {
                            $lt: Math.trunc(dayEnd.getTime() / 1000),
                        },
                    },
                    {
                        taskId: {
                            $in: taskIds,
                        },
                    },
                ],
            },
        })
        .exec();

    let totalSeconds = 0;
    items.map((i) => (totalSeconds += parseInt(i.duration)));
    return totalSeconds;
}

export default {
    foundTotalTimes,
};
