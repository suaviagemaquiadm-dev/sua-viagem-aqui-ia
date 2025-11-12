# Guia de Deploy Automatizado (CI/CD) - Sua Viagem Aqui

Este documento descreve o processo de deploy da aplicação, que é 100% automatizado através de um pipeline de Integração Contínua e Entrega Contínua (CI/CD) utilizando GitHub Actions.

## Processo de Deploy

O deploy para o ambiente de produção (Firebase Hosting e Functions) é acionado automaticamente sempre que novas alterações são enviadas (`push`) ou mescladas (`merge`) na branch `principal` do repositório.

**Para fazer o deploy de novas alterações, o único passo necessário é:**

```bash
git push origin principal
```

Ou, ao mesclar uma branch de funcionalidade na `principal` através de um Pull Request.

## O Que o Pipeline Faz?

O workflow automatizado, definido em `.github/workflows/firebase-ci.yml`, executa as seguintes etapas críticas para garantir a segurança, qualidade e performance da aplicação:

1.  **Instala as Dependências:** Instala as dependências do frontend (Vite) e do backend (Cloud Functions).
2.  **Build do Frontend:** Executa o comando `npm run build`, que usa o Vite para compilar, otimizar e minificar todos os arquivos HTML, CSS e JavaScript, gerando uma versão de alta performance na pasta `dist`.
3.  **Auditoria de Segurança:** Roda `npm audit` nas dependências do backend para detectar vulnerabilidades conhecidas.
4.  **Execução de Testes:** Roda os testes unitários do backend para garantir que a lógica de negócio continua funcionando como esperado.
5.  **Deploy Seguro:** Apenas se todas as etapas anteriores forem bem-sucedidas, o pipeline faz o deploy do frontend otimizado (pasta `dist`) e das Cloud Functions para o Firebase, usando um token de acesso temporário e seguro.

---

### Processo Manual Obsol9eto

**Aviso:** O processo de deploy manual (`firebase deploy` executado a partir de uma máquina local) está **obsoleto e estritamente descontinuado**.

Utilizá-lo representa um **risco de segurança** e contorna as etapas de verificação de qualidade e otimização de performance garantidas pelo nosso pipeline automatizado. O pipeline de CI/CD é a **única fonte de verdade** para os deploys.