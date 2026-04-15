# Edge Function - NF-e/SEFAZ

Esta funcao recebe o id da NF-e e executa o fluxo de autorizacao fiscal.

## Secrets necessarios

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SEFAZ_CERT_PFX_BASE64`
- `SEFAZ_CERT_PASSWORD`
- `SEFAZ_BASE_URL`
- `SEFAZ_ENV`

## Exemplo de payload

```json
{
  "nfe_id": "uuid-da-nota"
}
```

## Observacoes

O arquivo atual contem um fluxo mockado para homologacao. A integracao SOAP real deve implementar:

- montagem do XML assinado
- envio ao endpoint SEFAZ (autorizacao/cancelamento/inutilizacao)
- parser de retorno e persistencia de XML/DANFE no Supabase Storage
