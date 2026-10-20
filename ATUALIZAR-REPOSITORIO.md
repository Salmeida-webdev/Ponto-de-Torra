# Atualizar o repositório Ponto de Torra

O script `ATUALIZAR-REPOSITORIO.ps1` valida e compila o projeto, sincroniza os arquivos com a branch `main` de `Salmeida-webdev/Ponto-de-Torra` e envia um commit. O script confere o endereço remoto, evita sobrescrever um clone com alterações locais e não copia `.env`, dependências ou builds gerados.

Se o Git Credential Manager não estiver autenticado, o `git push` abrirá a autenticação do GitHub. A branch `main` é a branch padrão confirmada no repositório.

Com o ZIP em Downloads, execute:

```powershell
Expand-Archive -LiteralPath "$HOME\Downloads\Ponto-de-Torra-publicacao.zip" -DestinationPath "$HOME\Downloads\Ponto-de-Torra-atualizacao" -Force; powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\Downloads\Ponto-de-Torra-atualizacao\ATUALIZAR-REPOSITORIO.ps1"
```

O commit na `main` aciona o deploy do Netlify quando o site está conectado a esse repositório e a essa branch. O script não publica pelo CLI da Netlify.
