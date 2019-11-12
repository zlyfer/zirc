// jshint esversion: 6

function ui_init(cfg) {
	return new Vue({
		el: "#app",
		data: {
			config: cfg,
			connections: {},
			openPage: "settings",
			settingsPage: {
				selectedEntry: 1
			}
		},
		updated: function() {
			this.$nextTick(function() {});
		},
		mounted: function() {
			irc_init();
		},
		methods: {
			configValue(category, key, change = null) {
				if (change !== null) this.config[category].settings[key].value = change;
				return this.config[category].settings[key].value;
			},
			getConfigKeys() {
				return Object.keys(this.config).sort((a, b) => this.config[a].index - this.config[b].index);
			},
			settingsSelect(entry) {
				this.settingsPage.selectedEntry = this.config[entry].index;
			},
			getSelctedConfig() {
				let config = [];
				let tconfig = this.config[this.getConfigKeys().find(c => this.config[c].index == this.settingsPage.selectedEntry)].settings;
				Object.keys(tconfig).forEach(c => {
					tconfig[c]._var = c;
					config.push(tconfig[c]);
				});
				return config;
			}
		}
	});
}
