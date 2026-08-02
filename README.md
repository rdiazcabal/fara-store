# FARA Store Web

Ecommerce responsive para **FARA**, construido con la identidad del manual de marca: negro `#000000`, beige `#F3ECE3`, brown `#91766E`, rosy `#C8A19C` y blanco `#FFFFFF`.

Incluye catálogo filtrable, búsqueda, favoritos, carrito, sección mayorista, Docker con Nginx, health check y despliegue automático a Amazon ECS Fargate.

## Ejecutar localmente

```bash
docker compose up --build
```

Abre `http://localhost:8080`. Health check: `http://localhost:8080/health`.

## Recursos AWS usados

- Cuenta AWS: `269531437168`
- Región: `us-east-1`
- Rol OIDC: `arn:aws:iam::269531437168:role/GitHubActionsFacturacionRole`
- ECS cluster: `facturacion-cluster`
- ECS service: `farahn-store-web`
- Task definition family: `farahn-store-web`
- ECR repository: `farahn-store-web`
- Container: `farahn-store-web`, puerto `80`
- CloudWatch log group: `/ecs/farahn-store-web`
- Target group del ALB: puerto `80`, health check `/health`

El workflow crea automáticamente el repositorio ECR, el log group, la revisión de task definition y el ECS Service cuando todavía no existe.

## Variables opcionales del repositorio

- `ECS_SUBNETS`: subnet IDs separados por coma, sin espacios.
- `ECS_SECURITY_GROUPS`: security group IDs separados por coma, sin espacios.
- `ECS_TARGET_GROUP_ARN`: ARN del target group que apunta al contenedor en puerto `80`.
- `ECS_ASSIGN_PUBLIC_IP`: `DISABLED` por defecto.
- `ECS_DESIRED_COUNT`: `1` por defecto.

Cuando no se especifican las subnets o los security groups, el workflow intenta obtenerlos del servicio `facturacion-service`.

Ruta de configuración: **Settings → Secrets and variables → Actions → Variables**.

## IAM y OIDC

Los archivos de referencia están en [`infra/iam`](infra/iam). El rol de despliegue necesita acceso a ECR, ECS, CloudWatch Logs y `iam:PassRole` sobre `facturacionTaskExecutionRole`.

La trust policy está restringida a:

```text
repo:rdiazcabal/fara-store:ref:refs/heads/main
```

## Despliegue

Cada push a `main` ejecuta `.github/workflows/deploy.yml`:

1. Asume `GitHubActionsFacturacionRole` mediante OIDC.
2. Verifica la cuenta AWS y `facturacion-cluster`.
3. Crea ECR y CloudWatch Logs cuando sea necesario.
4. Construye y publica la imagen Docker.
5. Registra una nueva revisión de task definition.
6. Crea o actualiza `farahn-store-web`.
7. Espera a que el servicio quede estable.

## Alcance funcional

El frontend funciona como catálogo, favoritos y carrito. No incluye backend de inventario, autenticación, pasarela de pago ni procesamiento final de pedidos.
