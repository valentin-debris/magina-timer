import "roboto-fontface/css/roboto/roboto-fontface.css";
import "@mdi/font/css/materialdesignicons.css";

import PopupIdle from "./PopupIdle.vue";
import Vue from "vue";
import router from "../router";
import store from "../store";
import vuetify from "../plugins/vuetify";

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  vuetify,
  render: h => h(PopupIdle)
}).$mount("#app");
