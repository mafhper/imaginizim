# Imaginizim

Compressor de imagens local-first para web.

Imaginizim foi projetado para processar arquivos localmente, de forma rápida, com qualidade e customizações amplas.

- Demo: [mafhper.github.io/imaginizim](https://mafhper.github.io/imaginizim/)

![Preview da home](./public/readme-home-preview.png)

## O que o produto faz

- otimiza imagens sem depender de backend
- processa localmente no navegador
- suporta comparação sob demanda
- exporta arquivo individual ou ZIP

## Stack atual

- `React 19`
- `TypeScript`
- `Vite 7`
- `Tailwind CSS`
- `React Router`
- `i18next`
- `browser-image-compression`
- `SVGO`
- `JSZip`

## Arquitetura resumida

### Interface

- shell pública em `src/app`
- páginas principais em `src/app/pages`
- componentes compartilhados em `src/app/components`

### Motor de processamento

- estado e orquestração no provider de compressão
- processamento em `Web Worker`
- compressão raster com APIs do browser
- otimização SVG com `SVGO`

## Desenvolvimento

Windows PowerShell:

```powershell
npm install
npm run dev
```

WSL:

```bash
npm install
npm run dev
```

## Scripts úteis

```powershell
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
npm run test
npm run lighthouse:desktop
npm run lighthouse:mobile
```

## Build e deploy

- app estático
- compatível com GitHub Pages
- base configurada para `/imaginizim/`

## Qualidade

O fluxo de validação usado no projeto hoje combina:

- `TypeScript` para checagem estática
- `ESLint`
- `Vitest`
- capturas Playwright em `output/playwright`

## Licença

MIT
