exports.default = {
  swagger: function (api) {
    return {
      // Should be changed to hit www.yourserver.com.  If this is null, defaults to ip:port from
      // internal values or from hostOverride and portOverride.
      baseUrl: '127.0.0.1:8080',
      // Specify routes that don't need to be displayed
      ignoreRoutes: ['/swagger', '/ah-resque-ui'],
      // Specify how routes are grouped
      routeTags: {
        'basics': [],
        'system': ['documentation', 'status', 'transports'],
        'user': ['user'],
        'session': ['session'],
        'person': ['person', 'people'],
        'message': ['message', 'messages'],
        'event': ['event', 'events'],
        'list': ['list', 'lists'],
        'template': ['template'],
        'campaign': ['campaign'],
        'team': ['settings', 'setting']
      },
      // Generate documentation for simple actions specified by action-name
      documentSimpleRoutes: false,
      // Generate documentation for actions specified under config/routes.js
      documentConfigRoutes: true,
      // Set true if you want to organize actions by version
      groupByVersionTag: false,
      // For simple routes, groups all actions under a single category
      groupBySimpleActionTag: false,
      // In some cases where actionhero network topology needs to point elsewhere.  If null, uses
      // api.config.swagger.baseUrl
      hostOverride: true,
      // Same as above, if null uses the internal value set in config/server/web.js
      portOverride: null
    }
  }
}
