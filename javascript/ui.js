// jshint esversion: 6

function ui_init(cfg) {
  app = new Vue({
    el: "#app",
    data: {
      config: cfg,
      openPage: "irc",
      connections: {},
      busy: [],
      news: [],
      selectedSettings: "",
      selectedSettingsServer: "",
      selectedIrcServer: "",
      selectedIrcChannel: ""
    },
    watch: {
      selectedIrcChannel: function(val) {
        this.changeState(
          "news",
          `${this.selectedIrcChannel}@${this.selectedIrcServer}`,
          false
        );
      }
    },
    updated: function() {
      this.$nextTick(function() {});
    },
    mounted: function() {
      irc_init(this);
    },
    methods: {
      configValue(category, key, change = null) {
        if (change !== null) this.config[category].settings[key].value = change;
        return this.config[category].settings[key].value;
      },
      getConfigKeys() {
        return Object.keys(this.config).sort(
          (a, b) => this.config[a].index - this.config[b].index
        );
      },
      getSelctedConfig() {
        let config = [];
        if (this.selectedSettings) {
          let tconfig = this.config[
            this.getConfigKeys().find(n => n == this.selectedSettings)
          ].settings;
          Object.keys(tconfig).forEach(c => {
            tconfig[c]._var = c;
            config.push(tconfig[c]);
          });
        }
        return config;
      },
      getKeys(o) {
        return Object.keys(o);
      },
      changeState(type, target, state) {
        if (state) {
          if (!this[type].includes(target))
            if (
              type != "news" ||
              target != `${this.selectedIrcChannel}@${this.selectedIrcServer}`
            )
              this[type].push(target);
        } else this[type].splice(this[type].indexOf(target), 1);
      },
      sendMessage() {
        this.connections[this.selectedIrcServer].client.say(
          this.selectedIrcChannel,
          $("#input").val()
        );
        $("#input").val("");
      }
    }
  });
}
