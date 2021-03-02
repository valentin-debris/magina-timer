import "roboto-fontface/css/roboto/roboto-fontface.css";
import "@mdi/font/css/materialdesignicons.css";

import { getIntegrations, init, configureScope } from "@sentry/electron";

import App from "./App.vue";
import Vue from "vue";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";
import Config from "./plugins/electronStore";

const isDev = process.env.NODE_ENV !== "production";

Vue.config.productionTip = false;
//@ts-ignore
if (getIntegrations && getIntegrations().browser) {
    // We are running in the renderer
    //@ts-ignore
    const VueIntegration = getIntegrations().browser.Vue;
    init({
        dsn: process.env.VUE_APP_CRASH_HOST,
        environment: isDev ? "development" : "production",
        debug: true,
        integrations: [
            new VueIntegration({
                Vue,
                attachProps: true,
            }),
        ],
    });
} else {
    // We are running in the main process
    init({
        dsn: process.env.VUE_APP_CRASH_HOST,
        environment: isDev ? "development" : "production",
    });
}

if (Config.get("username")) {
    configureScope(function(scope) {
        scope.setUser({
            username: Config.get("username"),
        });
    });
}

Vue.directive("click-outside", {
    bind() {
        //@ts-ignore
        if (!this) return;
        //@ts-ignore
        this.event = (event) => this.vm.$emit(this.expression, event); //@ts-ignore
        this.el.addEventListener("click", this.stopProp); //@ts-ignore
        document.body.addEventListener("click", this.event);
    },
    unbind() {
        //@ts-ignore
        if (!this) return;
        //@ts-ignore
        this.el.removeEventListener("click", this.stopProp); //@ts-ignore
        document.body.removeEventListener("click", this.event);
    },
    //@ts-ignore
    stopProp(event) {
        event.stopPropagation();
    },
});

new Vue({
    router,
    store,
    vuetify,
    render: (h) => h(App),
}).$mount("#app");
