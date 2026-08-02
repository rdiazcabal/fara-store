# Configuración del servicio ECS

El despliegue usa los siguientes recursos:

- Cluster: `facturacion-cluster`
- Servicio: `farahn-store-web`
- Task definition: `farahn-store-web`
- Contenedor: `farahn-store-web`, puerto `80`
- ECR: `farahn-store-web`
- Log group: `/ecs/farahn-store-web`

## Valores predeterminados

El workflow está preparado para la cuenta `269531437168`, región `us-east-1`, rol de despliegue `GitHubActionsFacturacionRole` y execution role `facturacionTaskExecutionRole`.

El ARN del rol de despliegue puede cambiarse mediante la variable de repositorio `AWS_DEPLOY_ROLE_ARN` sin modificar el YAML.

## Red del servicio

Para crear el servicio por primera vez, el workflow intenta reutilizar automáticamente las subnets y security groups del servicio `facturacion-service` dentro de `facturacion-cluster`.

También pueden definirse explícitamente estas variables de repositorio:

- `ECS_SUBNETS`: IDs separados por coma.
- `ECS_SECURITY_GROUPS`: IDs separados por coma.
- `ECS_TARGET_GROUP_ARN`: target group opcional para publicar el servicio mediante un ALB.
- `ECS_ASSIGN_PUBLIC_IP`: `DISABLED` por defecto.
- `ECS_DESIRED_COUNT`: `1` por defecto.
- `SOURCE_ECS_SERVICE`: servicio del cual copiar la configuración de red; por defecto `facturacion-service`.

Sin `ECS_TARGET_GROUP_ARN`, el contenedor y el ECS Service se despliegan y quedan ejecutándose, pero no se asocian automáticamente a un ALB.
