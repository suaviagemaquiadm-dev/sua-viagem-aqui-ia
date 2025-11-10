# Guia de Deploy Manual - Sua Viagem Aqui

Este documento descreve o processo para fazer o deploy manual do projeto (Hosting e Functions) para o Firebase.

## Pré-requisitos

1.  **Node.js:** Certifique-se de que o Node.js (versão 22 ou superior) está instalado.
2.  **Firebase CLI:** Você precisa ter o Firebase Command Line Interface instalado globalmente.

## Passos para o Deploy

### 1. Instalar o Firebase CLI

Se você nunca instalou o Firebase CLI na sua máquina, execute o seguinte comando no seu terminal:

```bash
npm install -g firebase-tools
```

### 2. Autenticar com o Firebase

Antes de fazer o deploy, você precisa fazer login na sua conta do Google associada ao projeto do Firebase.

```bash
firebase login
```

Este comando abrirá uma janela no seu navegador para que você possa autenticar. Se você já estiver logado, ele confirmará a conta ativa.

### 3. Executar o Deploy

Navegue até a pasta raiz do seu projeto no terminal e execute o seguinte comando:

```bash
firebase deploy
```

Este comando fará o seguinte:
- **Compilará e publicará** suas Cloud Functions (da pasta `functions`).
- **Publicará** os arquivos do seu site (da pasta `public`) no Firebase Hosting.

Aguarde o processo ser concluído. O terminal exibirá o progresso e, ao final, confirmará que o deploy foi realizado com sucesso, mostrando as URLs do seu Hosting e das suas Functions.

---
**Observação:** Este processo manual foi adotado para agilizar o desenvolvimento. Um pipeline de CI/CD automatizado pode ser reintroduzido no futuro.
