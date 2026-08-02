# IAM para GitHub Actions

1. En IAM, confirma que existe el proveedor OIDC `token.actions.githubusercontent.com` con audiencia `sts.amazonaws.com`.
2. Crea o reutiliza un rol para GitHub Actions.
3. Reemplaza `REPLACE_ACCOUNT_ID` en `github-oidc-trust-policy.json` y úsalo como relación de confianza.
4. Reemplaza `REPLACE_ACCOUNT_ID` y `REPLACE_REGION` en `github-actions-deploy-policy.json`, crea una política y adjúntala al rol.
5. En GitHub crea el secret `AWS_DEPLOY_ROLE_ARN` con el ARN de ese rol.
6. Verifica que `ecsTaskExecutionRole` tenga adjunta la política administrada `AmazonECSTaskExecutionRolePolicy`.

La relación de confianza ya está limitada a `rdiazcabal/fara-store`, rama `main`.
