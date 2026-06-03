# Configuração do Ambiente - Testes E2E com Maestro

Este guia descreve os passos para configurar e executar testes End-to-End (E2E) no nosso aplicativo utilizando o [Maestro](https://maestro.mobile.dev/).

## Por que apenas Android?
Atualmente, o ambiente de testes suporta exclusivamente **Android**. A Apple impõe restrições rigorosas ao seu ecossistema: a compilação de aplicativos iOS nativos e a execução de ferramentas de automação para iOS (como os drivers do Maestro) exigem obrigatoriamente o sistema operacional macOS e o Xcode. Como o desenvolvimento ocorre em ambientes Windows/Linux, os testes locais são limitados ao Android.

## Dispositivos Suportados
Você pode executar os testes em duas modalidades:
* **Emulador Android:** Configurado via Android Studio. *(Requer boa capacidade de processamento do computador).*
* **Dispositivo Físico (Telefone):** Conectado via cabo USB. *(Requer a ativação das **Opções de Desenvolvedor** e da **Depuração USB** no aparelho).*

---

## Instalação do Maestro

### Linux e Windows (via WSL)
Abra o terminal e execute:
```bash
curl -Ls "[https://get.maestro.mobile.dev](https://get.maestro.mobile.dev)" | bash
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

## Preparando o App (Expo)
O Maestro precisa interagir com a versão nativa compilada do aplicativo, e não através do "Expo Go".
Com o dispositivo conectado (ou emulador aberto), compile e instale o app nativamente rodando na raiz do projeto:
```bash
npx expo run:android
```

---

## Como Utilizar

### Executando Testes
Os testes são escritos em arquivos `.yaml`. Para rodar um teste específico, utilize o comando:
```bash
maestro test caminho/para/o/arquivo.yaml
```

Para rodar todos os testes de uma pasta em sequência:
```bash
maestro test caminho/para/pasta/
```

### Usando o Maestro Studio (Criação Visual)
O Maestro Studio permite interagir com a tela do dispositivo e gerar o código YAML automaticamente.

1. **Baixe o Maestro Studio (Linux):**
```bash
   wget [https://studio.maestro.dev/MaestroStudio.AppImage](https://studio.maestro.dev/MaestroStudio.AppImage)
   chmod +x MaestroStudio.AppImage
   ```
2. Execute o arquivo `./MaestroStudio.AppImage`.
3. Interaja com a interface espelhada para copiar os comandos e colar nos arquivos de teste.

> **Opcional:** Para espelhar a tela do dispositivo físico no PC e facilitar o uso do app durante os testes, instale e rode o `scrcpy` no terminal.

---

## Referências
* [Documentação Oficial do Maestro](https://maestro.mobile.dev/)