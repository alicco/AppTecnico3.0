param(
    [string]$FunctionRole = "",
    [string]$FunctionName = "app-tecnico-backend"
)

Write-Host "Requisiti:"
Write-Host "1. AWS CLI installata e configurata (esegui 'aws configure')"
Write-Host "2. cargo-lambda installato (esegui 'cargo binstall cargo-lambda' o 'pip install cargo-lambda')"
Write-Host ""

if (!(Get-Command cargo-lambda -ErrorAction SilentlyContinue)) {
    Write-Host "Errore: cargo-lambda non trovato. Per favore installalo prima di procedere." -ForegroundColor Red
    exit 1
}

Write-Host "============= BUILD ==============="
cargo lambda build --release

Write-Host "============= DEPLOY =============="
if ($FunctionRole) {
    # Primo deploy con ruolo specifico
    cargo lambda deploy $FunctionName --iam-role $FunctionRole
} else {
    # Deploy successivo (aggiornamento del codice) o creazione interattiva
    Write-Host "Se è la prima volta che fai il deploy e non hai fornito un ruolo IAM, cargo-lambda ne creerà uno per te se hai i permessi." -ForegroundColor Yellow
    cargo lambda deploy $FunctionName
}

Write-Host "Deploy completato!" -ForegroundColor Green
Write-Host "Ricordati di impostare la variabile d'ambiente DATABASE_URL nella console AWS Lambda o tramite cargo lambda." -ForegroundColor Yellow
