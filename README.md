# FARA Store Web

Ecommerce responsive para **FARA**, siguiendo el manual de marca: negro `#000000`, beige `#F3ECE3`, brown `#91766E`, rosy `#C8A19C` y blanco `#FFFFFF`.

Incluye catálogo filtrable, búsqueda, favoritos, carrito, pedido por WhatsApp, sección mayorista, manual de marca integrado, Docker con Nginx, health check y archivos base para Amazon ECS Fargate.

## Ejecutar localmente

Puede abrir `index.html` directamente o servirlo con:

```bash
python -m http.server 8080
```

Abrir `http://localhost:8080`.

## Ejecutar con Docker

```bash
cp .env.example .env
# Cambiar WHATSAPP_NUMBER en .env

docker compose up --build
```

Abrir `http://localhost:8080`. Health check: `http://localhost:8080/health`.

## Recursos esperados en AWS

- ECR repository: `farahn-store-web`
- ECS cluster: `facturacion-cluster`
- ECS service: `farahn-store-web`
- Task definition family: `farahn-store-web`
- Container: `farahn-store-web`, puerto `80`
- CloudWatch log group: `/ecs/farahn-store-web`
- ALB target group con health check `/health`

`infra/ecs/task-definition.json` es una plantilla. Reemplazar `REPLACE_ACCOUNT_ID` y `REPLACE_REGION`, registrar la task definition y ejecutar `infra/ecs/create-service.sh` con las variables requeridas.

## GitHub Actions

`.github/workflows/deploy.yml` publica la imagen en ECR y actualiza ECS al hacer push a `main`.

Secrets requeridos:

- `AWS_DEPLOY_ROLE_ARN`: rol OIDC asumido por GitHub Actions.
- `WHATSAPP_NUMBER`: número internacional sin `+`, por ejemplo `50499999999`.

El rol necesita permisos de ECR/ECS y `iam:PassRole` sobre el execution role/task role de la task definition.

## Alcance

El frontend es funcional como catálogo y carrito de demostración. No incluye backend de inventario, autenticación ni pasarela de pagos.
