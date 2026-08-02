# FARA Store Web

Ecommerce responsive para **FARA**, construido con la identidad del manual de marca: negro `#000000`, beige `#F3ECE3`, brown `#91766E`, rosy `#C8A19C` y blanco `#FFFFFF`.

Incluye catálogo filtrable, búsqueda, favoritos, carrito, pedido por WhatsApp, sección mayorista, Docker/Nginx, health check y despliegue automático a Amazon ECS Fargate.

## Ejecutar localmente

```bash
cp .env.example .env
# Cambia WHATSAPP_NUMBER en .env

docker compose up --build
```

Abre `http://localhost:8080`. Health check: `http://localhost:8080/health`.

## Recursos AWS usados

- ECS cluster: `facturacion-cluster`
- ECS service: `farahn-store-web`
- Task definition family: `farahn-store-web`
- ECR repository: `farahn-store-web`
- Container: `farahn-store-web`, puerto `80`
- CloudWatch log group: `/ecs/farahn-store-web`
- Target group del ALB: puerto `80`, health check `/health`

El workflow crea automáticamente el repositorio ECR, el log group, la revisión de task definition y el ECS Service cuando todavía no existe.

## Configuración requerida en GitHub

### Secret

- `AWS_DEPLOY_ROLE_ARN`: ARN del rol IAM asumido mediante GitHub OIDC.
- `WHATSAPP_NUMBER`: opcional, número internacional sin `+`, por ejemplo `50499999999`.

### Repository variables

- `AWS_REGION`: opcional; por defecto `us-east-1`.
- `ECS_SUBNETS`: subnet IDs separados por coma, sin espacios.
- `ECS_SECURITY_GROUPS`: security group IDs separados por coma, sin espacios.
- `ECS_TARGET_GROUP_ARN`: ARN del target group que apunta al contenedor en puerto 80.
- `ECS_EXECUTION_ROLE_ARN`: opcional; por defecto usa `arn:aws:iam::<account>:role/ecsTaskExecutionRole`.
- `ECS_ASSIGN_PUBLIC_IP`: opcional; `DISABLED` por defecto.
- `ECS_DESIRED_COUNT`: opcional; `1` por defecto.

Ruta: **Settings → Secrets and variables → Actions**.

## IAM y OIDC

Los archivos de ejemplo están en [`infra/iam`](infra/iam). El rol de despliegue necesita acceso a ECR, ECS, CloudWatch Logs y `iam:PassRole` sobre el execution role de ECS.

La trust policy está restringida a:

```text
repo:rdiazcabal/fara-store:ref:refs/heads/main
```

## Despliegue

Cada push a `main` ejecuta `.github/workflows/deploy.yml`:

1. Asume el rol AWS por OIDC.
2. Verifica que `facturacion-cluster` esté activo.
3. Crea ECR y CloudWatch Logs cuando sea necesario.
4. Construye y publica la imagen Docker.
5. Registra una nueva revisión de task definition.
6. Crea o actualiza `farahn-store-web`.
7. Espera a que el servicio quede estable.

## Alcance funcional

El frontend funciona como catálogo y carrito con cierre de pedido por WhatsApp. No incluye backend de inventario, autenticación ni pasarela de pago.
