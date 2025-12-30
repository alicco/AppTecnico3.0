# AppTecnico3.0 - Manuale di Installazione e Avvio

## Prerequisiti
Assicurati di avere installato:
- **Node.js** (per il frontend)
- **Rust** (per il backend). Se non ce l'hai, installalo da [rustup.rs](https://rustup.rs/).
- **Git**

## 1. Configurazione Database (Supabase)
1.  Vai sul tuo progetto Supabase.
2.  Apri l'Editor SQL.
3.  Copia e incolla il contenuto del file `frontend/schema.sql` ed eseguilo. Questo creerà le tabelle necessarie (`printers`, `error_codes`, `spare_parts`, ecc.).

## 2. Configurazione Backend (Rust)
1.  Apri il file `backend/.env`.
2.  Aggiorna `DATABASE_URL` con la stringa di connessione del tuo database Supabase (usa la porta 5432 per la modalità transazione).
    *Esempio:* `postgres://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
3.  (Opzionale) Configura `REDIS_URL` se hai un'istanza Redis, altrimenti userà quella locale di default.

Avvia il backend:
```bash
cd backend
cargo run
```
Il server partirà su `http://localhost:8000`.

## 3. Configurazione Frontend (Next.js)
1.  Apri il file `frontend/.env.local`.
2.  Inserisci l'URL e la chiave anonima del tuo progetto Supabase:
    ```
    NEXT_PUBLIC_SUPABASE_URL=https://tuo-progetto.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tua-chiave-anonima
    ```

Avvia il frontend:
```bash
cd frontend
npm run dev
```
L'applicazione sarà accessibile su `http://localhost:3000`.

## 4. Importazione Dati
1.  Naviga su `http://localhost:3000/admin/import`.
2.  Inserisci il nome del modello (es. `C4080`).
3.  Carica il file CSV dei codici di errore.
4.  Clicca su "Import Data".

## 5. Utilizzo
Vai alla home page `http://localhost:3000`, seleziona il modello e cerca un codice di errore per vedere i dettagli e i ricambi suggeriti.
