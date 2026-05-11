# Konkrete Probleme bei romy.ai

## Was passiert technisch

Wenn jemand im Chat eine Website bauen lässt, läuft folgendes ab:
1. Claude (KI) bekommt den Prompt und schreibt Code
2. Eine Sandbox wird hochgefahren (E2B oder Vercel Sandbox)
3. Der Code wird in der Sandbox gebaut
4. Eine Subdomain wird live geschaltet

Das ist **eine** Function auf Vercel und dauert **30 bis 120 Sekunden**.

## Konkretes Problem 1: Timeout

- Im Code steht `maxDuration = 300` (5 Minuten)
- Vercel Hobby ignoriert das und kappt bei **60 Sekunden**
- Ergebnis: Function bricht mittendrin ab, User sieht Fehler oder Hänger

Betroffene Routen:
- `/api/chat` (maxDuration 300 → wird auf 60s gekappt)
- `/api/luna-whatsapp` (maxDuration 300 → wird auf 60s gekappt)
- `/api/images/generate` (maxDuration 120 → wird auf 60s gekappt)

## Konkretes Problem 2: Lange Prompts brechen ab

- Lange User-Nachricht → Claude antwortet länger → Sandbox-Build dauert länger
- Bei kurzen Prompts schafft es die Function meist noch unter 60s
- Bei längeren / komplexeren Prompts: **kompletter Abbruch**, kein Teilergebnis

## Konkretes Problem 3: Kommerzielle Nutzung

- Hobby ist laut Vercel-AGB nur für private/non-commercial Projekte
- romy.ai nimmt über Stripe Geld ein (`/api/stripe-webhook`, `/api/stripe-portal`)
- Vercel kann den Account jederzeit sperren

## Konkretes Problem 4: Mehrere User gleichzeitig

- Hobby hat niedrige Concurrency-Limits
- Wenn zwei Leute parallel chatten, kann eine Function geblockt werden
- Aktuell noch wenig User – wird zum Problem sobald Marketing läuft

## Was Pro konkret löst

| Problem | Hobby | Pro |
|---|---|---|
| Function-Timeout | 60s | bis 800s |
| Bandwidth | 100 GB | 1 TB |
| Concurrency | niedrig | hoch |
| Commercial Use | verboten | erlaubt |
| Logs / Debugging | basic | volle Logs + Filter |

## Was wir brauchen

1. Vercel-Account auf Pro upgraden (20 USD/Monat)
2. Danach checken: bricht der Chat immer noch ab?
3. Falls ja: in Vercel-Logs nach `FUNCTION_INVOCATION_TIMEOUT` oder `504` suchen
