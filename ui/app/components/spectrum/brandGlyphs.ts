/**
 * Brand glyphs (monochrome, `currentColor`, 20×20 SVG paths), one entry per technology the app names.
 *
 * Not included in this repository (npm run brand:strip): every key is kept with an empty path list, so
 * `BrandGlyph` draws an empty 20×20 box. To restore them: npm run brand:install -- --brand <kit> --glyphs <gallery index.html>.
 */

export const BRAND_GLYPHS = {
  // AmazonWebservicesIcon
  aws: [],
  // MicrosoftAzureSignetIcon
  azure: [],
  // GoogleCloudSignetIcon
  googleCloud: [],
  // KubernetesSignetIcon
  kubernetes: [],
  // KubernetesNodeKubeletKproxyIcon
  k8sNode: [],
  // KubernetesNsIcon
  k8sNamespace: [],
  // KubernetesWorkloadIcon
  k8sWorkload: [],
  // KubernetesPodIcon
  k8sPod: [],
  // KubernetesDeployIcon
  k8sDeployment: [],
  // OpenshiftSignetIcon
  openshift: [],
  // VmwareTanzuSignetIcon
  vmware: [],
  // DockerLogoIcon
  docker: [],
  // LinuxIcon
  linux: [],
  // WindowsIcon
  windows: [],
  // AndroidIcon
  android: [],
  // IosIcon
  ios: [],
  // JavaIcon
  java: [],
  // NodeJsIcon
  nodejs: [],
  // PythonIcon
  python: [],
  // DotnetIcon
  dotnet: [],
  // GolangSignetIcon
  go: [],
  // PhpIcon
  php: [],
  // RubyIcon
  ruby: [],
  // JavaScriptIcon
  javascript: [],
  // ApacheTomcatIcon
  tomcat: [],
  // JbossIcon
  jboss: [],
  // IisDotnetIcon
  iis: [],
  // NginxIcon
  nginx: [],
  // ApacheIcon
  apacheHttp: [],
  // EnvoyIcon
  envoy: [],
  // IstioSignetIcon
  istio: [],
  // KafkaSignetIcon
  kafka: [],
  // RabbitMqIcon
  rabbitmq: [],
  // OpentelemetryIcon
  openTelemetry: [],
  // MysqlIcon
  mysql: [],
  // PostgreIcon
  postgresql: [],
  // OracleIcon
  oracle: [],
  // SqlMicrosoftIcon
  sqlServer: [],
  // MongoDbIcon
  mongodb: [],
  // RedisIcon
  redis: [],
  // CassandraIcon
  cassandra: [],
  // IbmDb2Icon
  db2: [],
  // MariadbSignetIcon
  mariadb: [],
  // NewrelicIcon
  newRelic: [],
  // AppdynamicsIcon
  appDynamics: [],
  // SplunkIcon
  splunk: [],
  // ElasticSignetIcon
  elastic: [],
} as const satisfies Record<string, readonly string[]>;

export type BrandGlyph = keyof typeof BRAND_GLYPHS;
