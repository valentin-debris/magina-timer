import * as Sentry from "@sentry/electron";

let sentryInit = false;
const isDev = process.env.NODE_ENV !== "production";

function init() {
    Sentry.init({
        dsn: process.env.VUE_APP_CRASH_HOST,
    });
    sentryInit = true;
}

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function sendException(err: any) {
    if (isDev) console.log({ err });
    if (sentryInit === false) {
        init();
    }
    Sentry.captureException(err);
}

export default sendException;
