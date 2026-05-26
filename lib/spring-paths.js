var StiffEyesPaths = (function () {
  function dedupePaths(list) {
    var seen = Object.create(null);
    return list.filter(function (p) {
      if (seen[p]) return false;
      seen[p] = true;
      return true;
    });
  }

  var DEFAULT_SPRING_PATHS = dedupePaths([
    '/v2/api-docs',
    '/swagger-ui.html',
    '/swagger',
    '/api-docs',
    '/api.html',
    '/swagger-ui',
    '/swagger/codes',
    '/api/index.html',
    '/api/v2/api-docs',
    '/v2/swagger.json',
    '/swagger-ui/html',
    '/distv2/index.html',
    '/swagger/index.html',
    '/sw/swagger-ui.html',
    '/api/swagger-ui.html',
    '/static/swagger.json',
    '/user/swagger-ui.html',
    '/swagger-ui/index.html',
    '/swagger-dubbo/api-docs',
    '/template/swagger-ui.html',
    '/swagger/static/index.html',
    '/dubbo-provider/distv2/index.html',
    '/spring-security-rest/api/swagger-ui.html',
    '/spring-security-oauth-resource/swagger-ui.html',
    '/mappings',
    '/metrics',
    '/beans',
    '/configprops',
    '/actuator/metrics',
    '/actuator/mappings',
    '/actuator/beans',
    '/actuator/configprops',
    '/actuator',
    '/auditevents',
    '/autoconfig',
    '/beans',
    '/caches',
    '/conditions',
    '/configprops',
    '/docs',
    '/dump',
    '/env',
    '/jolokia/list',
    '/flyway',
    '/health',
    '/heapdump',
    '/httptrace',
    '/info',
    '/intergrationgraph',
    '/jolokia',
    '/logfile',
    '/loggers',
    '/liquibase',
    '/metrics',
    '/mappings',
    '/prometheus',
    '/refresh',
    '/scheduledtasks',
    '/sessions',
    '/shutdown',
    '/trace',
    '/threaddump',
    '/actuator/auditevents',
    '/actuator/beans',
    '/actuator/health',
    '/actuator/conditions',
    '/actuator/configprops',
    '/actuator/env',
    '/actuator/info',
    '/actuator/loggers',
    '/actuator/heapdump',
    '/actuator/threaddump',
    '/actuator/metrics',
    '/actuator/scheduledtasks',
    '/actuator/httptrace',
    '/actuator/mappings',
    '/actuator/jolokia',
    '/actuator/hystrix.stream',
    '/actuator/env',
    '/refresh',
    '/actuator/refresh',
    '/restart',
    '/actuator/restart',
    '/jolokia',
    '/actuator/jolokia',
    '/trace',
    '/actuator/httptrace',
    '/article?id=${7*7}',
    '/article?id=66',
    '/h2-console'
  ]);

  function buildSpringUrl(origin, pathname, pathEntry) {
    var base = (origin + pathname).replace(/\/$/, '');
    var p = pathEntry.replace(/^\//, '');
    return base + '/' + p;
  }

  function getDefaultDirectoriesText() {
    return DEFAULT_SPRING_PATHS.join('\n');
  }

  return {
    DEFAULT_SPRING_PATHS: DEFAULT_SPRING_PATHS,
    buildSpringUrl: buildSpringUrl,
    getDefaultDirectoriesText: getDefaultDirectoriesText
  };
})();
