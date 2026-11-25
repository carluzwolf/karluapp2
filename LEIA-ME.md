# Karlu — app Android (v2)

App nativo (Capacitor) com tela própria: animação de entrada com o Karlu, login (e-mail/senha e Google via Firebase),
uso offline depois do primeiro login e visual "Liquid Glass" (ilha dinâmica + barra de baixo de vidro).
O Bluetooth usa o plugin nativo do Android.

## Estrutura
- `app/` — telas do app (index.html, css/app.css, js/app.js, js/disp.js). É aqui que você edita o visual.
- `site/` — o site antigo. O app só reaproveita dele o motor do display e o protocolo Bluetooth (`site/js/eyes.js`, `reacoes*.js`, `configurar.js`).
- `src/` — ponte nativa (Bluetooth, login, compartilhar, botão voltar).
- `firebase/google-services.json` — **você coloca aqui** o arquivo do Firebase.
- `signing/debug.keystore` — chave fixa do app (necessária para o login do Google). Não apague.
- `scripts/`, `.github/workflows/build-apk.yml`, `android-res/` — build do APK e ícones.

## Firebase (login)
1. https://console.firebase.google.com → criar projeto.
2. Authentication → Começar → Método de login: ativar **E-mail/senha** e **Google**.
3. Configurações do projeto → Seus apps → Adicionar app **Android**:
   - Nome do pacote: `shop.starlyninfinite.karlu`
   - SHA-1: `72:93:5C:DC:FE:69:CA:5C:76:4E:70:BF:59:3F:1E:3C:07:CC:D0:00`
4. Baixe o `google-services.json` **depois** de ativar o Google e cadastrar o SHA-1 (se baixou antes, baixe de novo).
5. Coloque o arquivo em `firebase/google-services.json`, faça commit e push.

## Gerar o APK
Push no GitHub → aba Actions → Gerar APK do Karlu → baixe **Karlu-APK** em Artifacts.
Sem o `google-services.json` o APK ainda é gerado, mas só entra em "modo teste" (sem login).

## Importante
- A chave de assinatura mudou: **desinstale o Karlu antigo** do celular antes de instalar este.
- Depois do primeiro login com internet, o app abre e controla o Karlu sem internet.
