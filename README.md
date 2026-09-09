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

## Inventario único

La fuente oficial es [assets/inventory.json](assets/inventory.json). Es el único JSON de inventario que se mantiene y se publica. Contiene las 51 familias históricas, sus SKU, tonos, precios al detalle, existencias, fotografías, estados y auditoría. El catálogo muestra únicamente referencias con estado `active` y stock positivo; las demás quedan conservadas para revisión o reactivación futura.

Los estados son `active`, `out_of_stock`, `withdrawn`, `review` y `absent_from_snapshot`. Una referencia retirada, pendiente o ausente no se reactiva automáticamente al recibir más stock. Los SKU son identificadores únicos globales y no se comparten entre fórmulas. Las tres correcciones confirmadas de True Match están incorporadas en los datos y en la auditoría.

Para comprobar el inventario:

```bash
node scripts/inventory.js validate
```

Para actualizar una referencia existente sin crear otro JSON:

```bash
node scripts/inventory.js set FARA0000523 stock=2 tone=2-3 price=490
```

Para una carga de varias referencias, `node scripts/inventory.js apply archivo.json` acepta un archivo temporal con `changes`, o `apply -` acepta el contenido por stdin. El archivo de entrada no se conserva como otra fuente. Cada cambio se valida antes de escribir el inventario; los errores impiden toda la carga. Para referencias nuevas se requiere la familia verificada y sus datos de producto. Para una fotografía completa se puede indicar `fullSnapshot: true`: los SKU activos ausentes quedan archivados, no se ofrecen con existencias antiguas. Use esta opción únicamente cuando el corte sea completo.

El historial de cambios se conserva dentro de `audit.events` y en Git. Los archivos anteriores permanecen recuperables en el commit `ec0bf355098e4104ad33cc0738670579175bd11a`, pero ya no son fuentes activas. Las estadísticas históricas de `audit.reconciliation` corresponden al corte original y no se usan para calcular existencias actuales.

La tienda utiliza únicamente precios al detalle. No se incluyen costos ni precios mayoristas. Las existencias son una fotografía del inventario; no existe sincronización en tiempo real con facturación y la disponibilidad final se confirma por WhatsApp. Esta herramienta no modifica el aplicativo de facturación.
