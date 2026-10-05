---
marp: true
theme: default
paginate: true
---

# Integration med 3-partssystem


# Kursen på en bild

- **Vecka 41–47:** lektioner måndag och onsdag 09–17, handledning fredag 13–17
- **Block A (v41–44):** REST, dataformat, sök, betalning, lagring, frakt
- **Block B (v45–47):** tokens, OAuth, GitHub, e-post, sociala medier
- **Ett case:** er e-handelsplattform kopplas mot omvärlden

---

# Examination

| | Uppgift 1 | Uppgift 2 |
|---|---|---|
| Läranderesultat | 1, 3, 5 | 2, 4 |
| Betyg | IG/G | IG/G/VG |
| Presenteras | 12/10 | 2/11 |
| Inlämning | Fre 30/10 kl. 23:59 | Fre 20/11 kl. 23:59 |

Båda uppgifterna är **individuella**.

---

# Er shop idag → er shop om 7 veckor

| Idag | Om 7 veckor |
|---|---|
| Produktlista | Sök-API + import från leverantör (CSV/XML) |
| Varukorg | Riktig betalning + fraktberäkning |
| Produktbilder URL till online bild| Bilduppladdning till Molnlagring |
| Egen inloggning | Logga in med GitHub/Google + e-postverifiering |

---


# Vad är ett 3-partssystem?

En tjänst som **någon annan** bygger, driver och ansvarar för – och som din app använder via ett gränssnitt.

- **Första part:** du (din app)
- **Andra part:** din användare
- **Tredje part:** Klarna, Shippo, GitHub, Google, Cloudinary …

---

# Varför inte bygga själv?

| Bygga själv | Integrera |
|---|---|
| Kortbetalning kräver PCI DSS-certifiering | Stripe har den redan |
| E-post hamnar i skräpposten | SendGrid/Resend har rykte hos Gmail |
| Egen lösenordshantering = eget ansvar vid läckor | "Logga in med Google" |
| Månader av utveckling | Timmar eller dagar |

**Tumregel:** bygg det som är ert unika värde, integrera resten.

---

# Priset: du blir beroende

- **Driftstopp** – deras problem blir ditt problem
- **Prisändringar** – gratisnivåer försvinner
- **Versionering** – API:er ändras och gamla versioner stängs
- **Inlåsning** – svårt att byta leverantör
- **GDPR** – leverantören blir *personuppgiftsbiträde*, data kan hamna utanför EU
- **Säkerhet** – API-nycklar som läcker ger andra tillgång i ditt namn

---

# Integrationsmodeller

| Modell | Hur det fungerar | I kursen |
|---|---|---|
| REST-anrop | Du frågar, de svarar | Frakt, sök, valutor |
| Webhooks | De ringer dig när något händer | Stripe, GitHub |
| Polling | Du frågar om och om igen | Jämförelse med webhooks |
| SDK | Deras bibliotek sköter HTTP åt dig | Stripe SDK |
| Redirect/hosted | Användaren skickas till dem och tillbaka | Stripe Checkout, OAuth |
| Filbaserad | Filer utbyts (CSV, XML, SFTP) | Leverantörskatalog |
| GraphQL/SOAP | Andra API-stilar | Orientering |

---

# Push eller pull?

**Polling (pull):** "Är betalningen klar? … Nu då? … Nu då?"

**Webhook (push):** "Jag hör av mig när betalningen är klar."

- Polling är enkelt men slösar anrop och är långsamt
- Webhooks är effektiva men kräver en publik URL och verifiering

---

# Synkront eller asynkront?

Vad händer när den externa tjänsten är **långsam** eller **nere**?

- Användaren väntar i 30 sekunder? ❌
- Hela sidan kraschar? ❌
- Timeout + tydligt felmeddelande + fallback? ✅

**Varje extern tjänst kommer att gå ner någon gång.** Designa för det.

---

# Hittills: fetch i React

```jsx
// React – körs i användarens webbläsare
useEffect(() => {
  fetch('https://api.frankfurter.dev/v1/latest?base=SEK')
    .then((res) => res.json())
    .then((data) => setRates(data.rates));
}, []);
```

Fungerar – så länge API:et är öppet, gratis och saknar nyckel.

Men betalportaler, frakt-API:er och molnlagring kräver **hemliga nycklar**.

---

# Från och med nu: via Express

```jsx
// React – anropar VÅR backend
fetch('/api/currency/rates?base=SEK')
```

```ts
// Express – anropar tredje part
const res = await fetch(`${process.env.CURRENCY_API_URL}/latest?base=SEK`, {
  signal: AbortSignal.timeout(5000),
});
```

Samma `fetch` – men nu på servern.

---

# Varför via backend?

```
❌  React ──────────────→ Extern tjänst
✅  React ──→ Express ──→ Extern tjänst
```

1. **Hemligheter** – API-nycklar syns i webbläsaren
2. **CORS** – många API:er tillåter inte anrop från webbläsaren
3. **Rate limits** – en cache i backend skyddar din kvot
4. **Omformning** – React får *din* datamodell, inte leverantörens
5. **Byte av leverantör** – bara backend behöver ändras

---

# Vad är nytt när fetch körs på servern?

| | I webbläsaren | På servern (Node) |
|---|---|---|
| `fetch` | Finns | Finns också, samma syntax |
| CORS | Kan stoppa anropet | Gäller inte – CORS är en webbläsarregel |
| API-nycklar | Syns för alla i DevTools | Stannar på servern i `.env` |
| Timeout | Webbläsaren bestämmer | Du bestämmer (`AbortSignal.timeout`) |
| Fel | Syns direkt för användaren | Du skickar ett begripligt svar till React |
| Loggar | Webbläsarens konsol | Serverns terminal eller loggarna i Render/Vercel |

---

# Adaptermönstret

```
routes/currency.ts  →  integrations/currencyAdapter.ts  →  Frankfurter API
     (din app)                 (adaptern)                   (tredje part)
```

- Routes och React vet **inte** vilken leverantör som används
- Adaptern översätter leverantörens format till ert format
- Byter ni leverantör skriver ni om **en** fil

Vi använder mönstret i hela kursen.

---


# Kod genomgång

**Priser i flera valutor i webbshoppen**

- API: Frankfurter (Europeiska centralbankens växelkurser)
- Ingen API-nyckel behövs
- Dokumentation: https://frankfurter.dev


---

# Kom igång med Express & React med TS
- [getting-started-with-express-and-react.md](getting-started-with-express-and-react.md)


