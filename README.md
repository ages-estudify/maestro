# Configuração do Ambiente - Testes E2E com Maestro

Este guia descreve os passos para configurar, executar e gerenciar testes End-to-End (E2E) no nosso aplicativo utilizando o [Maestro](https://maestro.mobile.dev/).

---

## Por que apenas Android?
Atualmente, o ambiente de testes suporta exclusivamente **Android**. A Apple impõe restrições rígosas ao seu ecossistema: a compilação de aplicativos iOS nativos e a execução de ferramentas de automação para iOS (como os drivers do Maestro) exigem obrigatoriamente o sistema operacional macOS e o Xcode. Como o desenvolvimento ocorre em ambientes Windows/Linux, os testes locais são limitados ao Android.

## Dispositivos Suportados
Você pode executar os testes em duas modalidades:
* **Emulador Android:** Configurado via Android Studio. *(Requer boa capacidade de processamento do computador).*
* **Dispositivo Físico (Telefone):** Conectado via cabo USB. *(Requer a ativação das **Opções de Desenvolvedor** e da **Depuração USB** no aparelho).*

---

## Instalação do Maestro

### Linux e Windows (via WSL)
Abra o terminal e execute:
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Após a instalação, adicione o Maestro ao seu `PATH`:
```bash
echo 'export PATH="$PATH:$HOME/.maestro/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Windows (Nativo)
Se estiver usando Windows nativamente sem WSL, adicione o caminho de instalação às Variáveis de Ambiente:
1. Pressione `Win + R`, digite `sysdm.cpl` e pressione `Enter`.
2. Acesse **Avançado** > **Variáveis de Ambiente**.
3. Em *"Variáveis do sistema"*, edite a variável `Path` e adicione o caminho: `C:\Users\SEU_USUARIO\.maestro\bin`.

Verifique se a instalação foi bem-sucedida:
```bash
maestro --version
```

---

## Arquitetura e Componentes Criados

### 1. O Script de Inicialização `start.sh`
O [start.sh](file:///home/vitor/Documentos/ages/ages4/repos/maestro/start.sh) automatiza a inicialização de todo o ecossistema de desenvolvimento e testes. Ele realiza o seguinte:
* Valida se há algum dispositivo Android conectado via ADB.
* Faz o redirecionamento de porta (`adb reverse`) para que o aplicativo no dispositivo consiga acessar o backend local na porta `3000`.
* Inicia o banco de dados via Docker e roda as migrations do Prisma (`npx prisma migrate reset`).
* Inicializa o backend em NestJS e inicia o build do frontend em Expo.
* Configura a variável `JAVA_TOOL_OPTIONS` para que qualquer relatório de crash da JVM (usada pelo compilador e runner do Maestro) seja salvo na pasta local [logs/](file:///home/vitor/Documentos/ages/ages4/repos/maestro/logs) em vez de poluir a raiz do repositório.
* Executa o Maestro Studio em um terminal separado.

### 2. O Microserviço de Apoio `server.js`
Durante os testes de interface, é comum precisar redefinir o estado do banco de dados (ex: deletar o usuário de teste para permitir novo cadastro). 
* **O problema**: O interpretador JS nativo do Maestro roda em sandbox e não possui suporte para conectar a bancos de dados diretamente usando bibliotecas do Node como o `pg`.
* **A solução**: Criamos o [server.js](file:///home/vitor/Documentos/ages/ages4/repos/maestro/server.js), um microserviço HTTP leve (utilizando módulos nativos do Node) executado no host durante os testes (porta `3001`). 
* Quando recebe uma chamada HTTP `POST /delete-user`, o microserviço executa o script modular [utils/dbDeleteUser.js](file:///home/vitor/Documentos/ages/ages4/repos/maestro/utils/dbDeleteUser.js) que remove o usuário especificado e todas as suas chaves estrangeiras vinculadas de maneira segura no PostgreSQL local.

---

## Como Utilizar o Ambiente

### 1. Inicializando os Serviços Básicos
Primeiro, garanta que seu celular ou emulador esteja conectado e execute o script na raiz da pasta `maestro`:
```bash
./start.sh
```

### 2. Executando os Testes via NPM
Configuramos scripts no [package.json](file:///home/vitor/Documentos/ages/ages4/repos/maestro/package.json) para inicializar e desligar o microserviço `server.js` automaticamente em conjunto com o Maestro:

* **Para rodar o fluxo completo de registro (com limpeza prévia de banco)**:
  ```bash
  npm run test:register
  ```
* **Para rodar o fluxo de login**:
  ```bash
  npm run test:login
  ```
* **Para rodar o fluxo de onboarding**:
  ```bash
  npm run test:onboarding
  ```
* **Para rodar o fluxo de treinamento diário**:
  ```bash
  npm run test:training
  ```
* **Para rodar o fluxo de simulados**:
  ```bash
  npm run test:simulados
  ```
* **Para rodar o fluxo de cronograma semanal**:
  ```bash
  npm run test:schedule
  ```
* **Para rodar o fluxo de progresso e estatísticas**:
  ```bash
  npm run test:progress
  ```
* **Para rodar o fluxo de perfil e planos**:
  ```bash
  npm run test:profile
  ```
* **Para rodar todos os testes de forma sequencial (com retry automático)**:
  ```bash
  npm run test
  ```
  Este comando executa o script [run-tests.js](file:///home/vitor/Documentos/ages/ages4/repos/maestro/run-tests.js) que descobre todos os fluxos `.yaml` na pasta `flows/`, garantindo que:
  - Os fluxos que contêm `"simulado"` sejam executados por último.
  - Cada teste possua um mecanismo de **retry automático de até 1 vez** (máximo de 2 tentativas) caso falhe.
  - As configurações do `.env` sejam injetadas (`setupConfig.js`) e limpas (`restoreConfig.js`) de forma automatizada ao final da execução.
* **Para iniciar o Maestro Studio com suporte a limpeza do banco**:
  ```bash
  npm run studio
  ```

#### Utilitários de Configuração (Variáveis de Ambiente)
Se quiser rodar os testes individualmente via CLI do Maestro ou debugar sem usar os comandos agregados, você pode preparar ou limpar os arquivos YAML manualmente:
* **Injetar variáveis do `.env` nos arquivos `.yaml`**:
  ```bash
  npm run config:setup
  ```
* **Limpar variáveis injetadas dos arquivos `.yaml` (evita enviar segredos no git)**:
  ```bash
  npm run config:restore
  ```

---

## Criando Novos Scripts de Teste

Se você quiser criar novos fluxos de teste locais ou adicionar novos scripts, siga estas diretrizes:

Crie um arquivo `.yaml` de teste principal dentro das subpastas numeradas da pasta `flows/`. O cabeçalho deve declarar o `appId`.

```yaml
appId: estudify.develop
---
- runScript: "../utils/triggerCleanDb.js"   # Opcional: Garante que o banco seja limpo antes do teste iniciar
- runFlow: "../1_apresentacao_boas_vindas/FirstAccessAppSkip.yaml"
- tapOn: "Registrar"
- inputText: ${NOME}
```

### Usando Variáveis de Ambiente (.env)
Você pode usar a sintaxe `${NOME_DA_VARIAVEL}` nos arquivos YAML.
1. Declare a variável no arquivo [.env](file:///home/vitor/Documentos/ages/ages4/repos/maestro/.env).
2. O script [setupConfig.js](file:///home/vitor/Documentos/ages/ages4/repos/maestro/setupConfig.js) irá ler e injetar essas variáveis nos fluxos `.yaml` antes da execução dos testes.
3. O script [restoreConfig.js](file:///home/vitor/Documentos/ages/ages4/repos/maestro/restoreConfig.js) limpa os valores injetados após o término do teste para evitar vazamento de credenciais no git.

### Controlando o Banco nos Novos Testes
Se o seu novo teste precisar limpar um usuário específico do banco de dados, você pode chamar o nosso microserviço via script JS do Maestro.

Crie um arquivo `.js` no Maestro (exemplo: `CleanCustomUser.js`):
```javascript
try {
  var response = http.post('http://localhost:3001/delete-user', {
    headers: {
      'Content-Type': 'application/json'
    },
    // Envie o e-mail que deseja deletar. Se omitido ou enviado vazio {}, 
    // o servidor utilizará por padrão o EMAIL definido no seu .env
    body: JSON.stringify({ email: "usuario_customizado@email.com" })
  });

  if (response.status !== 200) {
    throw new Error('Falha ao limpar banco: ' + response.body);
  }
  console.log('Banco de dados preparado com sucesso!');
} catch (error) {
  throw new Error('Erro na chamada do microserviço: ' + error.message);
}
```

E no seu fluxo `.yaml`, adicione o comando:
```yaml
- runScript: CleanCustomUser.js
```

---

## Diretório de Logs
Todos os arquivos residuais e relatórios de erro gerados pela Java Virtual Machine (JVM) do Maestro são criados dentro do diretório [logs/](file:///home/vitor/Documentos/ages/ages4/repos/maestro/logs). Esse diretório está configurado no `.gitignore` para evitar o envio de arquivos indesejados ao repositório git.

## Referências
* [Documentação Oficial do Maestro](https://maestro.mobile.dev/)