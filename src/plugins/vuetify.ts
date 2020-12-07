import '@fortawesome/fontawesome-free/css/all.css';

import Vue from "vue";
import Vuetify from "vuetify/lib";
import fr from "vuetify/src/locale/fr";

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    options: {
      customProperties: true
    },
    themes: {
      light: {
        primary: "#00566d",
        secondary: "#000000",
        accent: "#82B1FF",
        error: "#FF5252",
        info: "#2196F3",
        success: "#4CAF50",
        warning: "#FFC107",
        background: "#f7f7f7"
      }
    }
  },
  icons: {
    iconfont: 'fa',
  },
  lang: {
    locales: { fr },
    current: "fr"
  }
});
