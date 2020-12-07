import "roboto-fontface/css/roboto/roboto-fontface.css";
import "@mdi/font/css/materialdesignicons.css";

import { getIntegrations, init } from "@sentry/electron";

import App from "./App.vue";
import Vue from "vue";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;
//@ts-ignore
if (getIntegrations && getIntegrations().browser) {
    // We are running in the renderer
    //@ts-ignore
    const VueIntegration = getIntegrations().browser.Vue;
    init({
        dsn: process.env.VUE_APP_CRASH_HOST,
        debug: true,
        integrations: [new VueIntegration()],
    });
} else {
    // We are running in the main process
    init({
        dsn: process.env.VUE_APP_CRASH_HOSTy,
    });
}

new Vue({
    router,
    store,
    vuetify,
    render: (h) => h(App),
}).$mount("#app");
